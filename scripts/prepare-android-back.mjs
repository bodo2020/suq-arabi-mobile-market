import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const mainActivityPath = 'android/app/src/main/java/com/elmadawy/market/customer/MainActivity.java';
await mkdir(path.dirname(mainActivityPath), { recursive: true });

const mainActivity = `package com.elmadawy.market.customer;

import android.app.AlertDialog;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NavigationBarPlugin.class);
        super.onCreate(savedInstanceState);

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

// Lets the app colour the Android navigation bar (see NativeStatusBarSync.tsx).
const navigationBarPluginPath = path.join(path.dirname(mainActivityPath), 'NavigationBarPlugin.java');
const navigationBarPlugin = `package com.elmadawy.market.customer;

import android.graphics.Color;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Colours the Android navigation bar (the strip under the app with the
 * system buttons / gesture line) so it matches the screen: brand green on
 * the launch intro, the page colour in light and dark mode.
 */
@CapacitorPlugin(name = "NavigationBar")
public class NavigationBarPlugin extends Plugin {

    @PluginMethod
    public void setColor(PluginCall call) {
        String color = call.getString("color");
        Boolean darkButtons = call.getBoolean("darkButtons", false);
        if (color == null) {
            call.reject("color is required");
            return;
        }
        final int parsed;
        try {
            parsed = Color.parseColor(color);
        } catch (IllegalArgumentException e) {
            call.reject("invalid color");
            return;
        }
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            window.setNavigationBarColor(parsed);
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            // Dark buttons on a light bar, light buttons on a dark bar.
            controller.setAppearanceLightNavigationBars(Boolean.TRUE.equals(darkButtons));
            call.resolve(new JSObject());
        });
    }
}
`;
await writeFile(navigationBarPluginPath, navigationBarPlugin, 'utf8');
console.log('Android hardware back behavior applied: WebView history first, exit confirmation at root.');
