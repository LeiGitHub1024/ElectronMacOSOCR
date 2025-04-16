{
  "targets": [
    {
      "target_name": "improved_ocr",
      "sources": [
        "src/improved_node_binding.mm",
        "src/improved_ocr_impl.mm"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "link_settings": {
        "libraries": [
          "-framework Foundation",
          "-framework Vision",
          "-framework AppKit",
          "-framework CoreML",
          "-framework CoreImage"
        ]
      },
      "xcode_settings": {
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++20", "-stdlib=libc++"],
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "CLANG_CXX_LIBRARY": "libc++",
        "CLANG_ENABLE_OBJC_ARC": "YES",
        "PRODUCT_DIR": "build"
      },
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"]
    }
  ]
}
