package com.elmadawy.market.customer;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.phone.SmsRetriever;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.common.api.Status;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Google SMS User Consent: while the code screen is open, the next SMS with a code (from a number not in the
 * contacts) makes Android ask "allow the app to read this message?" once; on yes the 6-digit code is filled.
 * No SMS permission, no app hash in the message, works with any OTP text.
 */
@CapacitorPlugin(name = "SmsCode")
public class SmsCodePlugin extends Plugin {
    private static final Pattern CODE = Pattern.compile("(?<![0-9])([0-9]{6})(?![0-9])");
    private BroadcastReceiver receiver;
    private PluginCall listening;

    @PluginMethod
    public void start(PluginCall call) {
        stopListening();
        try {
            SmsRetriever.getClient(getActivity()).startSmsUserConsent(null)
                .addOnSuccessListener(ignored -> {
                    register();
                    call.setKeepAlive(true);
                    listening = call;
                    call.resolve();
                })
                .addOnFailureListener(error -> call.reject("unavailable"));
        } catch (Exception error) {
            call.reject("unavailable");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopListening();
        call.resolve();
    }

    private void register() {
        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                if (!SmsRetriever.SMS_RETRIEVED_ACTION.equals(intent.getAction())) return;
                Bundle extras = intent.getExtras();
                Status status = extras == null ? null : (Status) extras.get(SmsRetriever.EXTRA_STATUS);
                if (status == null) return;
                if (status.getStatusCode() == CommonStatusCodes.SUCCESS) {
                    Intent consent = extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT);
                    if (consent != null && listening != null) {
                        try { startActivityForResult(listening, consent, "consentResult"); } catch (Exception ignored) { }
                    }
                } else if (status.getStatusCode() == CommonStatusCodes.TIMEOUT) {
                    notifyListeners("timeout", new JSObject());
                    stopListening();
                }
            }
        };
        ContextCompat.registerReceiver(getContext(), receiver, new IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
            SmsRetriever.SEND_PERMISSION, null, ContextCompat.RECEIVER_EXPORTED);
    }

    @ActivityCallback
    private void consentResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            String message = result.getData().getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE);
            Matcher m = message == null ? null : CODE.matcher(message);
            if (m != null && m.find()) {
                JSObject data = new JSObject();
                data.put("code", m.group(1));
                notifyListeners("code", data);
            }
        }
        stopListening();
    }

    private void stopListening() {
        if (receiver != null) {
            try { getContext().unregisterReceiver(receiver); } catch (Exception ignored) { }
            receiver = null;
        }
        if (listening != null) {
            try { getBridge().releaseCall(listening); } catch (Exception ignored) { }
            listening = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopListening();
    }
}
