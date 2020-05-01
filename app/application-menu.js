const { app, dialog, BrowserWindow, Menu, shell } = require('electron');
const mainProcess = require('./main');

process.env.NODE_ENV = 'production';

const createApplicationMenu = (file) => {
    const hasOneOrMoreWindows = !!BrowserWindow.getAllWindows().length;
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const hasFilePath = !!(focusedWindow && ( focusedWindow.getRepresentedFilename() || file ));
    
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New File',
                    accelerator: 'CommandorControl+N',
                    click(){
                        mainProcess.createWindow();
                    }
                },
                {
                    label: 'Open File',
                    accelerator: 'CommandorControl+O',
                    click(item, focusedWindow){
                        if(focusedWindow){
                            return mainProcess.getFileFromUser(focusedWindow);
                        }
    
                        const newWindow = mainProcess.createWindow();
                        newWindow.on('show', ()=>{
                            mainProcess.getFileFromUser(newWindow);
                        });
                    }
                },
                {
                    label: 'Save File',
                    accelerator: 'CommandorControl+S',
                    enabled: hasOneOrMoreWindows,
                    click(item, focusedWindow){
                        if(!focusedWindow){
                            return dialog.showErrorBox(
                                'Cannot Save or Export',
                                'There is currently no active document to save or export.'
                            );
                        }
    
                        focusedWindow.webContents.send('save-markdown');
                    }
                },
                {
                    label: 'Export HTML',
                    accelerator: 'Shift+S',
                    enabled: hasOneOrMoreWindows,
                    click(item, focusedWindow){
                        if(!focusedWindow){
                            return dialog.showErrorBox(
                                'Cannot Save or Export',
                                'There is currently no active document to save or export.'
                            );
                        }
    
                        focusedWindow.webContents.send('save-html');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Show File',
                    accelerator: 'CommandorControl+Shift+S',
                    enabled: hasFilePath,
                    click(item, focusedWindow){
                        if(!focusedWindow){
                            return dialog.showErrorBox(
                                'Cannot Show File\'s Location',
                                'There is currently no active document to show.'
                            );
                        }
                        focusedWindow.webContents.send('show-file');
                    }
                },
                {
                    label: 'Open in Default Editor',
                    accelerator: 'Shift+O',
                    enabled: hasFilePath,
                    click(item, focusedWindow){
                        if(!focusedWindow){
                            return dialog.showErrorBox(
                                'Cannot Open File in Default Editor',
                                'There is currently no active document to open.'
                            );
                        }
                        focusedWindow.webContents.send('open-in-default');
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CommandorControl+Z',
                    role: 'undo'
                },
                {
                    label: 'Redo',
                    accelerator: 'CommandorControl+Shift+Z',
                    role: 'redo'
                },
                { type: 'separator' },
                {
                    label: 'Cut',
                    accelerator: 'CommandorControl+X',
                    role: 'cut'
                },
                {
                    label: 'Copy',
                    accelerator: 'CommandorControl+C',
                    role: 'Copy'
                },
                {
                    label: 'Paste',
                    accelerator: 'CommandorControl+V',
                    role: 'paste'
                },
                {
                    label: 'Select All',
                    accelerator: 'CommandorControl+A',
                    role: 'selectall'
                }
            ]
        },
        {
            label: 'Window',
            role: 'window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'CommandorControl+M',
                    role: 'minimize'
                },
                {
                    label: 'Close',
                    accelerator: 'CommandorControl+W',
                    role: 'close'
                }
            ]
        },
        {
            label: 'Help',
            role: 'help',
            submenu: [
                {
                    label: 'Visit Website',
                    click(){
                        shell.openExternal('https://www.codemaniac.net/mark')
                    }
                }
            ]
        }
    ];
    
    if(process.env.NODE_ENV === 'development'){
        const devtools = {
            label: 'Devtools',
            submenu: [
                {
                    label: 'Toggle Devtools',
                    accelerator: 'F12',
                    click(item, focusedWindow){
                        focusedWindow.toggleDevTools();
                    }
                },
                {
                    role: 'reload'
                }
            ]
        };
    
        template.push(devtools);
    }
    
    if(process.platform == 'darwin'){
        const name = app.getName();
        template.unshift({
            label: name,
            submenu: [
                {
                    label: `About ${name}`,
                    role: 'about'
                },
                { type: 'separator' },
                {
                    label: 'Services',
                    role: 'services',
                    submenu: []
                },
                { type: 'separator' },
                {
                    label: `Hide ${name}`,
                    accelerator: 'Command+H',
                    role: 'hide'
                },
                {
                    label: 'Hide Others',
                    accelerator: 'Command+Alt+H',
                    role: 'hideothers'
                },
                {
                    label: 'Show All',
                    role: 'unhide'
                },
                { type: 'separator' },
                {
                    label: `Quit ${name}`,
                    accelerator: 'Command+Q',
                    click(){
                        app.quit();
                    }
                }
            ]
        });
        
        const windowMenu = template.find(item => item.label === 'Window');
        
        windowMenu.role = 'window';
        windowMenu.submenu.push(
            { type: 'separator' },
            {
                label: 'Bring All to Front',
                role: 'front'
            }
        );
    }

    return Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}


module.exports = createApplicationMenu;