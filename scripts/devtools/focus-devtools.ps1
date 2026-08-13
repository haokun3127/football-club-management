Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
}
'@
$p = Get-Process wechatdevtools -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne '' }
foreach ($proc in $p) {
  [Win]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
  [Win]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
  Write-Host "focused: $($proc.Id)"
}
