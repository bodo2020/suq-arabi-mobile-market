import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const mainActivityPath = 'android/app/src/main/java/com/elmadawy/market/customer/MainActivity.java';
await mkdir(path.dirname(mainActivityPath), { recursive: true });

const mainActivity = `package com.elmadawy.market.customer;

import android.app.AlertDialog;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // SMS code autofill on the OTP screens (Google SMS User Consent), see android-native/SmsCodePlugin.java
        registerPlugin(SmsCodePlugin.class);
        super.onCreate(savedInstanceState);
        // Android 16 always draws the app under the status and navigation bars;
        // the page pads itself with the safe-area insets (Capacitor SystemBars, css mode).
        // After super.onCreate: Capacitor switches from the splash theme there, and
        // touching the window earlier would keep the splash theme's title bar.
        EdgeToEdge.enable(this);

        // Android draws its own scroll indicator (and on some phones a light
        // track) on the WebView, even with CSS scrollbars hidden; it showed as
        // a white line on the launch intro and at the screen edge.
        WebView appWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (appWebView != null) {
            appWebView.setVerticalScrollBarEnabled(false);
            appWebView.setHorizontalScrollBarEnabled(false);
        }

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
await copyFile('android-native/SmsCodePlugin.java', path.join(path.dirname(mainActivityPath), 'SmsCodePlugin.java'));
console.log('Android hardware back behavior applied: WebView history first, exit confirmation at root.');
