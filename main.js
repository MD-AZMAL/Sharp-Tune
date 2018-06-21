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

let MainWin, AboutWin;
let ico = nativeImage.createFromPath(path.join(__dirname, 'logo.png'));

function createMainWindow() {
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
                // For Dev only
                // {
                //     role: 'toggledevtools'
                // },
                // {
                //     role: 'reload'
                // },
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
                    label: 'About',
                    click: () => {
                        AboutWin = new BrowserWindow({
                            center: true,
                            parent: MainWin,
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
                }
            ]
        }
    ];

    let appMenu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(appMenu);
}

function selectFolderDialog() {
    dialog.showOpenDialog({ properties: ['openDirectory'] }, file => {
        if (file) {
            fs.readdir(file[0], (err, files) => {
                let fileObject = { loc: file[0], files: [] };
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