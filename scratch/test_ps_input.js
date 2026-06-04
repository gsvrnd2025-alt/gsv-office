const { spawn } = require('child_process');

console.log("Spawning PowerShell process...");
const psProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

psProcess.stdout.on('data', (data) => {
  console.log(`[STDOUT]: ${data.toString()}`);
});

psProcess.stderr.on('data', (data) => {
  console.error(`[STDERR]: ${data.toString()}`);
});

const initCmds = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$signature = @"
using System;
using System.Runtime.InteropServices;
public class Win32Input {
    [DllImport("user32.dll")]
    public static extern void mouse_event(int flags, int dx, int dy, int data, int extraInfo);
}
"@
if (-not ([System.Management.Automation.PSTypeName]"Win32Input").Type) {
    Add-Type -TypeDefinition $signature
}
`;

console.log("Writing initialization commands...");
psProcess.stdin.write(initCmds + "\n");

// Send a test mouse positioning + click command to coordinates (100, 100)
const testCmd = `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(100, 100)
[Win32Input]::mouse_event(0x0002, 0, 0, 0, 0)
[Win32Input]::mouse_event(0x0004, 0, 0, 0, 0)
Write-Output "Mouse command completed"
`;

setTimeout(() => {
  console.log("Writing test mouse command...");
  psProcess.stdin.write(testCmd + "\n");
}, 1000);

setTimeout(() => {
  console.log("Quitting...");
  psProcess.stdin.end();
}, 3000);
