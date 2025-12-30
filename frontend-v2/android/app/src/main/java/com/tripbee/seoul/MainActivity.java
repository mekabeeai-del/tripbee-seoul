package com.tripbee.seoul;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 웹뷰가 시스템 영역(Safe Area)을 침범하지 않도록 Padding 부여
        View contentView = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, windowInsets) -> {
            var insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());

            // 시스템 바 두께만큼 패딩 설정
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom);

            return windowInsets;
        });
    }
}
