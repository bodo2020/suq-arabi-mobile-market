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
        super.onCreate(savedInstanceState);

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
console.log('Android hardware back behavior applied: WebView history first, exit confirmation at root.');
