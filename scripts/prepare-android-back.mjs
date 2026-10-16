import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const mainActivityPath = 'android/app/src/main/java/com/elmadawy/market/customer/MainActivity.java';
await mkdir(path.dirname(mainActivityPath), { recursive: true });

const mainActivity = `package com.elmadawy.market.customer;

import android.app.AlertDialog;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

public class MainActivity extends BridgeActivity {
    private static final String UPDATE_PREFS = "play_update_prompt";
    private static final long PROMPT_INTERVAL_MS = 24L * 60L * 60L * 1000L;

    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener updateListener;
    private boolean updateDialogVisible;
    private boolean foreground;
    private final ActivityResultLauncher<IntentSenderRequest> updateLauncher = registerForActivityResult(
        new ActivityResultContracts.StartIntentSenderForResult(),
        result -> {
            // A declined or failed Play update is non-fatal; we will offer it later.
        }
    );

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 16 always draws behind system bars. Pad the native container,
        // then zero only the handled insets so WebView does not double-pad them.
        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            int types = WindowInsetsCompat.Type.systemBars()
                | WindowInsetsCompat.Type.displayCutout();
            Insets bars = windowInsets.getInsets(types);
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return new WindowInsetsCompat.Builder(windowInsets)
                .setInsets(types, Insets.NONE)
                .build();
        });
        ViewCompat.requestApplyInsets(content);

        WebView appWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (appWebView != null) {
            appWebView.getSettings().setSupportZoom(false);
            appWebView.getSettings().setBuiltInZoomControls(false);
            appWebView.getSettings().setDisplayZoomControls(false);
        }

        appUpdateManager = AppUpdateManagerFactory.create(this);
        updateListener = state -> {
            if (state.installStatus() == InstallStatus.DOWNLOADED && foreground) {
                runOnUiThread(this::showDownloadedUpdatePrompt);
            }
        };
        appUpdateManager.registerListener(updateListener);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                showExitConfirmation();
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        foreground = true;
        if (appUpdateManager == null) return;
        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (!foreground || isFinishing() || isDestroyed()) return;
            if (info.installStatus() == InstallStatus.DOWNLOADED) {
                showDownloadedUpdatePrompt();
            } else if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                showAvailableUpdatePrompt(info);
            }
        });
    }

    @Override
    public void onPause() {
        foreground = false;
        super.onPause();
    }

    @Override
    public void onDestroy() {
        if (appUpdateManager != null && updateListener != null) {
            appUpdateManager.unregisterListener(updateListener);
        }
        super.onDestroy();
    }

    private void showAvailableUpdatePrompt(AppUpdateInfo info) {
        if (updateDialogVisible) return;
        String key = "version_" + info.availableVersionCode();
        long lastPrompt = getSharedPreferences(UPDATE_PREFS, Context.MODE_PRIVATE)
            .getLong(key, 0L);
        long now = System.currentTimeMillis();
        if (now - lastPrompt < PROMPT_INTERVAL_MS) return;

        updateDialogVisible = true;
        getSharedPreferences(UPDATE_PREFS, Context.MODE_PRIVATE)
            .edit().putLong(key, now).apply();
        new AlertDialog.Builder(this)
            .setTitle("تحديث جديد متاح")
            .setMessage("في نسخة أحدث من تطبيق ســــــوبـرمــــاركو. تقدر تحدّثه الآن من Google Play بدون حذف التطبيق أو بياناتك.")
            .setNegativeButton("لاحقًا", null)
            .setPositiveButton("تحديث الآن", (dialog, which) -> {
                try {
                    appUpdateManager.startUpdateFlowForResult(
                        info,
                        updateLauncher,
                        AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build()
                    );
                } catch (Exception ignored) {
                    // Google Play can decline the flow if the app was sideloaded.
                }
            })
            .setOnDismissListener(dialog -> updateDialogVisible = false)
            .show();
    }

    private void showDownloadedUpdatePrompt() {
        if (updateDialogVisible || !foreground) return;
        updateDialogVisible = true;
        new AlertDialog.Builder(this)
            .setTitle("التحديث جاهز")
            .setMessage("اكتمل تنزيل التحديث. أعد تشغيل التطبيق لتثبيته بدون فقدان بياناتك.")
            .setNegativeButton("لاحقًا", null)
            .setPositiveButton("إعادة التشغيل", (dialog, which) -> appUpdateManager.completeUpdate())
            .setOnDismissListener(dialog -> updateDialogVisible = false)
            .show();
    }

    private void showExitConfirmation() {
        if (isFinishing()) return;

        new AlertDialog.Builder(this)
            .setTitle("الخروج من التطبيق")
            .setMessage("هل تريد الخروج من البرنامج؟")
            .setNegativeButton("إلغاء", null)
            .setPositiveButton("خروج", (dialog, which) -> {
                dialog.dismiss();
                finishAffinity();
            })
            .show();
    }
}
`;

await writeFile(mainActivityPath, mainActivity, 'utf8');
console.log('Android hardware back behavior applied: WebView history first, exit confirmation at root.');
