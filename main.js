const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const dialog = electron.dialog;
const ipc = electron.ipcMain;
const nativeImage = electron.nativeImage;

const path = require('path');
const url = require('url');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const isDev = require('electron-is-dev');

autoUpdater.logger = require('electron-log');
autoUpdater.autoDownload = false;
autoUpdater.logger.transports.file.level = 'info';

let MainWin, AboutWin;
let ico = nativeImage.createFromPath(path.join(__dirname, 'logo.png'));
let usr_apd = false;

function createMainWindow() {
    if (!isDev) {
        autoUpdater.checkForUpdates();

    }

    MainWin = new BrowserWindow({
        show: false,
        center: true,
        width: 900,
        height: 500,
        minWidth: 900,
        minHeight: 500,
        icon: ico
    });

    MainWin.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
    }));

    MainWin.on('ready-to-show', () => {
        MainWin.show();
    });

    MainWin.on('closed', () => {
        MainWin = null;
    });

    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Select Folder',
                    accelerator: 'CmdOrCtrl + F',
                    click: selectFolderDialog
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl + Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About #Tune',
                    click: () => {
                        AboutWin = new BrowserWindow({
                            center: true,
                            parent: MainWin,
                            modal: true,
                            width: 500,
                            height: 300,
                            minWidth: 500,
                            minHeight: 300,
                            maxWidth: 500,
                            maxHeight: 300,
                            autoHideMenuBar: true,
                            maximizable: false,
                            minimizable: false,
                            icon: ico
                        });

                        AboutWin.loadURL(url.format({
                            pathname: path.join(__dirname, 'about.html'),
                            protocol: 'file',
                            slashes: true
                        }));
                    }
                },
                {
                    label: 'Check for Updates',
                    click: () => {
                        usr_apd = true;
                        autoUpdater.checkForUpdates();
                    }
                }
            ]
        }
    ];

    if (isDev) {
        template.push({
            label: 'Dev',
            submenu: [
                { role: 'toggledevtools' },
                { role: 'reload' }
            ]
        });
    }

    let appMenu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(appMenu);
}

function selectFolderDialog() {
    dialog.showOpenDialog({ properties: ['openDirectory'] }, file => {
        if (file) {
            let sl;
            if (process.platform === 'linux') {
                sl = '/';
            } else if (process.platform === 'win32') {
                sl = '\\';
            }

            fs.readdir(file[0], (err, files) => {
                let fileObject = { sl: sl, loc: file[0], files: [] };
                files.forEach((current_file) => {
                    if (current_file.endsWith('.mp3') || current_file.endsWith('.wav')
                        || current_file.endsWith('.m4a') || current_file.endsWith('.MP3')
                        || current_file.endsWith('.WAV') || current_file.endsWith('.M4A')) {
                        fileObject.files.push(current_file);
                    }
                });
                MainWin.webContents.send('selected-folder', fileObject);
            });
        }
    });
}

autoUpdater.on('update-available', (info) => {
    // console.log('Update Available');
    // console.log('Version : ' + info.version);
    // console.log('Release Date : ' + info.releaseDate);

    dialog.showMessageBox(MainWin, {
        title: 'Updates',
        type: 'info',
        message: 'Update Available',
        detail: 'A new version has been found. Click on Update to Update',
        buttons: ['Update', 'Cancel']
    }, function (res) {
        if (res === 0) {
            autoUpdater.downloadUpdate();
        }
    });
});

autoUpdater.on('update-not-available', () => {
    if (usr_apd) {
        dialog.showMessageBox(MainWin, {
            title: 'Updates',
            type: 'info',
            message: 'Update Not Available',
            detail: 'Your App is Up-todate',
            buttons: ['OK']
        });
        usr_apd = false;
    }
});

autoUpdater.on('download-progress', (progress) => {
    MainWin.webContents.send('update-download', progress.percent);
});

autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(MainWin, {
        title: 'Updates',
        type: 'info',
        message: 'Update Downloaded',
        detail: 'The Update has been downloaded. Click on Install to install',
        buttons: ['Update', 'Cancel']
    }, function (res) {
        if (res === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

autoUpdater.on('error', (err) => {
    dialog.showMessageBox(MainWin, {
        title: 'Updates',
        type: 'info',
        message: 'Error',
        detail: err,
        buttons: ['Cancel']
    });
});

app.on('ready', () => {
    createMainWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (MainWin === null) {
        createWindow();
    }
});
