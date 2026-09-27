# Local Tunnel
A locally hosted app to share files and notes between devices in your local network.

## Current Features
- Share notes
  - Notes have quick access buttons to copy them, or select them the clipboard is not available on the browser
- Share files
  - They can be renamed on upload
  - It has basic detection to avoid overriding an existing file
  > It will append an `(n)` to the filename like windows does when you download a file with a name matching one of your currently existing ones.
  - They can be deleted

## Prerequisites
- Node.js
  - Install from https://nodejs.org/
  - Or, if you have Chocolatey installed: `choco install nodejs-lts -y`

## Setup
Right now, only Windows is supported, but Linux should work too.

Before proceeding, make sure to make a copy of the `server/.env.example` file inside the `server/` folder, rename the copy to `server/.env`, and inside the file modify the value of `PUBLIC_HOST` to the IPv4 of your hosting device. It sounds complicate, but you can find it going to the properties of your Wi-Fi inside the device, it should look like `192.168.x.x`.

If you leave `PUBLIC_HOST` blank instead (like `PUBLIC_HOST=`), the app will try to find and use your IPv4 adress by itself, but is not recommended since it can be innacurate, making the app not work.

### Windows and Linux
From the repository root, do one of the next two to run the app (after creating the `server/.env` file).

Double click the file (Windows):
```sh
run-win-linux.sh
```

From the terminal, run:
```sh
bash run-win-linux.sh
```
