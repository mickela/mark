const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const createApplicationMenu = require('./application-menu');


const windows = new Set();
const openFiles = new Map();

app.on('ready', ()=> {
    createApplicationMenu();
    createWindow();
});

app.on('window-all-closed', ()=>{
    if(process.platform === 'darwin') return false;
    app.quit();
});

app.on('activate', (event, hasVisibleWindows)=>{
    if(!hasVisibleWindows) createWindow();
});

app.on('will-finish-launching', ()=>{
    app.on('open-file', (event, file)=>{
        const win = createWindow();
        win.once('ready-to-show', ()=>{
            openFile(win, file);
        });
    });
});

const createWindow = exports.createWindow = () =>{
    let x, y;

    const currentWindow = BrowserWindow.getFocusedWindow();

    if(currentWindow){
        const [ currentWindowX, currentWindowY ] = currentWindow.getPosition();
        x = currentWindowX + 50;
        y = currentWindowY + 80;
    };

    let newWindow = new BrowserWindow({ x, y, show: false, webPreferences: { nodeIntegration: true } });

    newWindow.loadURL(url.format({
        slashes: true,
        protocol: 'file',
        pathname: path.join(__dirname, 'index.html')
    }));

    newWindow.once('ready-to-show', ()=> newWindow.show());

    newWindow.on('focus', createApplicationMenu);

    newWindow.on('close', (e)=>{
        e.preventDefault();
        newWindow.webContents.send('close-window');
    })

    newWindow.on('closed', ()=>{
        windows.delete(newWindow);
        createApplicationMenu();
        stopWatchingFile(newWindow);
        newWindow = null;
    });

    windows.add(newWindow);
    return newWindow;
}


const getFileFromUser = exports.getFileFromUser = async targetWindow =>{
    const files = await dialog.showOpenDialog(targetWindow, { 
        properties: [ 'openFile' ],
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'Markdown Files', extensions: ['md', 'markdown'] }
        ]
    });

    if(files.canceled) return;

    const file = files.filePaths[0];
    openFile(targetWindow, file);
    
};

const openFile = exports.openFile = (targetWindow, file) =>{
    startWatchingFile(targetWindow, file)
    const content = fs.readFileSync(file).toString();
    addToRecentlyOpened(file);

    targetWindow.setRepresentedFilename(file);
    targetWindow.webContents.send('file-opened', file, content);
    createApplicationMenu(file);
};

const saveHtml = exports.saveHtml = async (targetWindow, content) =>{
    const file = await dialog.showSaveDialog(targetWindow, {
        title: 'Save HTML',
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'HTML Files', extensions: [ 'html', 'htm' ] }
        ]
    });


    if(file.canceled) return;

    const htmlTop = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
    `;

    const htmlBottom = `
    </body>
    </html>
    `;

    let htmlWithContent = htmlTop + content + htmlBottom;

    fs.writeFileSync(file.filePath, htmlWithContent);
};

const saveMarkdown = exports.saveMarkdown = async (targetWindow, file, content) =>{
    if(!file){
        file = await dialog.showSaveDialog(targetWindow, {
            title: 'Save Menu',
            defaultPath: app.getPath('documents'),
            filters: [
                { name: 'Markdown Files', extensions: [ 'md', 'markdown' ] }
            ]
        });
    }

    if(file.canceled) return;

    
    fs.writeFileSync((typeof file === 'object' ? file.filePath : file), content);
    addToRecentlyOpened((typeof file === 'object' ? file.filePath : file));
    targetWindow.webContents.send('update-ui', false, (typeof file === 'object' ? file.filePath : file));

};

const addToRecentlyOpened = file =>{
    app.addRecentDocument(file);
}

const startWatchingFile = (targetWindow, file) => {
    stopWatchingFile(targetWindow);

    const watcher = fs.watchFile(file, (event)=>{

        if(event.nlink === 1){
            const content = fs.readFileSync(file).toString();
            targetWindow.webContents.send('file-changed', file, content);
        }
    });

    openFiles.set(targetWindow, watcher);
};

const stopWatchingFile = (targetWindow) =>{
    if(openFiles.has(targetWindow)){
        openFiles.get(targetWindow).stop();
        openFiles.delete(targetWindow);
    }
};