# Design: Parent phone authorization single-flight guard

The current WXML has one `open-type="getPhoneNumber"` button, but `submitting` is set only after the native callback. A fast second touch can therefore invoke the native API before the asynchronous state update disables the button.

Use a private synchronous boolean on the page instance. The touch handler acquires it before native authorization; the callback exits when already consumed. Keep view state for rendering only. Do not add retries or change the backend contract.
