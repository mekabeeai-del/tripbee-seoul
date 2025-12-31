package com.tripbee.seoul;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 웹뷰가 시스템 영역(Safe Area)을 침범하지 않도록 Padding 부여
        View contentView = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, windowInsets) -> {
            var insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return windowInsets;
        });

        // 마이크 권한 미리 요청
        requestMicPermission();
    }

    @Override
    public void onStart() {
        super.onStart();

        // Capacitor의 WebChromeClient를 확장해서 마이크 권한 처리 추가
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    // 마이크 권한 요청 처리
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this,
                                    Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                                request.grant(request.getResources());
                                return;
                            }
                        }
                    }
                    // 다른 권한은 기본 처리
                    super.onPermissionRequest(request);
                });
            }
        });
    }

    private void requestMicPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    PERMISSION_REQUEST_CODE);
        }
    }
}
