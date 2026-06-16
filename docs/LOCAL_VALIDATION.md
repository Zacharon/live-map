# Local Validation

Live Map expects Node.js 20 or newer and npm. The repository has no required package lockfile or install step for the built-in validation commands; the checks run with standard Node/npm commands from `package.json`.

## Standard Commands

From the repository root:

```powershell
node --version
npm --version
npm run check
npm run security:scan
node --check app.js
```

If you are using Command Prompt or a Unix-like shell, the same commands should work.

## Windows Codex PATH Repair

Some Codex Windows shells may omit the system Node install from the process `PATH` even when Node is installed globally. In that state, `node` can resolve to an inaccessible WindowsApps/Codex shim and `npm` may be missing.

Known failing shape:

```text
node -> C:\Program Files\WindowsApps\OpenAI.Codex_...\app\resources\node.exe
node --version -> Access is denied
npm -> not found
```

If `C:\Program Files\nodejs\node.exe` and `C:\Program Files\nodejs\npm.cmd` exist, repair the current PowerShell process with:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
node --version
npm.cmd --version
npm.cmd run check
npm.cmd run security:scan
node --check app.js
```

Use `npm.cmd` in PowerShell if `npm` resolves to `npm.ps1` and the execution policy blocks script files. This avoids changing the user's machine policy. A non-persistent alternative is:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

After that, plain `npm run check` should work for the current PowerShell process.

## If Node Is Not Installed

Install a current LTS or newer Node.js version that satisfies `package.json`:

```text
engines.node >=20
```

Then open a fresh shell and rerun:

```powershell
node --version
npm --version
npm run check
npm run security:scan
```

GitHub Actions uses `actions/setup-node` with Node 20 and remains the authoritative CI environment, but local agents should first try the PATH repair above before reporting that local validation is unavailable.
