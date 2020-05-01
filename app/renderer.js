const { remote, ipcRenderer, shell } = require('electron');
const { Menu } = remote;
const mainProcess = remote.require('./main.js');
const marked = require('marked');
const path = require('path');
const currentWindow = remote.getCurrentWindow();

const $ = selector => document.querySelector(selector);
const $A = selector => document.querySelectorAll(selector);

let filePath = null;
let originalContent = "";
let currentContent = "";

const markdownView = $('#markdown');
const htmlView = $('#html');
const newFileButton = $('#new-file');
const openFileButton = $('#open-file');
const saveMarkdownButton = $('#save-markdown');
const revertButton = $('#revert');
const saveHtmlButton = $('#save-html');
const showFileButton = $('#show-file');
const openInDefaultButton = $('#open-in-default');

const isEdited = () => originalContent !== currentContent;


['dragstart', 'dragover', 'dragleave', 'drop'].forEach(event =>{
    document.addEventListener(event, e => e.preventDefault());
});

const renderMarkdownToHtml = markdown =>{
    htmlView.innerHTML = marked(markdown, { gfm: true });
};

markdownView.addEventListener('keyup', e =>{
    // const currentContent = e.target.value;
    currentContent = e.target.value;

    renderMarkdownToHtml(currentContent);
    updateUserInterface(currentContent !== originalContent);
    openLinksInDefaultBrowser();
});

markdownView.addEventListener('contextmenu', e =>{
    e.preventDefault();
    createContextMenu().popup();
});

openFileButton.addEventListener('click', ()=>{
    mainProcess.getFileFromUser(currentWindow);
});

newFileButton.addEventListener('click', ()=>{
    mainProcess.createWindow();
});

saveHtmlButton.addEventListener('click', saveHTML);

saveMarkdownButton.addEventListener('click', saveMD);

revertButton.addEventListener('click', undo);

showFileButton.addEventListener('click', showFile);

openInDefaultButton.addEventListener('click', openInDefaultApplication);

function saveMD(){
    mainProcess.saveMarkdown(currentWindow, filePath, markdownView.value);
}

function saveHTML(){
    mainProcess.saveHtml(currentWindow, htmlView.innerHTML);
}

function undo (){
    markdownView.value = originalContent;
    renderMarkdownToHtml(originalContent);
    updateUserInterface();
}

function showFile(){
    if(!filePath){
        return alert('This file has not been saved to the filesystem.');
    }
    shell.showItemInFolder(filePath);
};

function openInDefaultApplication(){
    if(!filePath){
        return alert('This file has not been saved to the filesystem.');
    }
    shell.openItem(filePath);
}

ipcRenderer.on('file-opened', async (event, file, content) =>{
    if(currentWindow.isDocumentEdited() || originalContent !== currentContent){
        const result = await remote.dialog.showMessageBox(currentWindow, {
            type: 'warning',
            title: 'Overwrite Current Unsaved Changes?',
            message: 'Opening a new file in this window will overwrite your unsaved changes. Open this file anyway?',
            buttons: [ 'Yes', 'Cancel' ],
            defaultId: 0,
            cancelId: 1
        });

        if(result.response === 1) { return; }
    }

    renderFile(file, content);
    currentContent = content;
});

ipcRenderer.on('close-window', async e =>{

    if(originalContent !== currentContent){
        const result = await remote.dialog.showMessageBox(currentWindow, {
            type: 'warning',
            title: 'Quit with unsaved changes?',
            message: 'Your changes will be lost if you do not save them.',
            buttons: [
                'Quit Anyway',
                'Cancel'
            ],
            defaultId: 0,
            cancelId: 1
        });

        if(result.response === 0) currentWindow.destroy();
    }else{
        currentWindow.destroy()
    }
});

ipcRenderer.on('update-ui', (event, isEdited, filepath)=>{
    filePath = filepath;
    updateUserInterface(isEdited)
});

ipcRenderer.on('file-changed', async (event, file, content) => {
    if(content !== currentContent){
        const result = await remote.dialog.showMessageBox(currentWindow, {
            type: 'warning',
            title: 'Overwrite Current Unsaved Changes?',
            message: 'Another application has changed this file. Load changes?',
            buttons: [ 'Yes', 'Cancel' ],
            defaultId: 0,
            cancelId: 1
        });
    
    
        if(result.response === 1){
            saveMD();
            return; 
        }
    }

    renderFile(file, content);
})

ipcRenderer.on('save-markdown', saveMD);

ipcRenderer.on('save-html', saveHTML);

ipcRenderer.on('show-file', showFile);

ipcRenderer.on('open-in-default', openInDefaultApplication);

function updateUserInterface(isEdited){
    let title = 'Mark';

    if(filePath) title = `${path.basename(filePath)} - ${title}`;
    if(isEdited) title = `${title} (Edited)`;

    currentWindow.setTitle(title);
    currentWindow.setDocumentEdited(isEdited);

    saveMarkdownButton.disabled = !isEdited;
    revertButton.disabled = !isEdited;
}

const openLinksInDefaultBrowser = () =>{
    $A('a').forEach(el =>{
        el.addEventListener('click', (e)=>{
            e.preventDefault();
            shell.openExternal(e.target.href)
        })
    })
};

const getDraggedFile = event => event.dataTransfer.items[0];
const getDroppedFile = event => event.dataTransfer.files[0];

const fileTypeIsSupported = file =>{
    return ['text/plain', 'text/markdown', 'text/md', ''].includes(file.type);
};

markdownView.addEventListener('dragover', e =>{
    const file = getDraggedFile(e);

    if(fileTypeIsSupported(file)){
        markdownView.classList.add('drag-over');
    }else{
        markdownView.classList.add('drag-error');
    }
});

markdownView.addEventListener('dragleave', ()=>{
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

markdownView.addEventListener('drop', e =>{
    const file = getDroppedFile(e);

    if(fileTypeIsSupported(file)){
        mainProcess.openFile(currentWindow, file.path);
    }else{
        alert('That file type is not supported');
    }

    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
})

function renderFile(file, content) {
    filePath = file;
    originalContent = content;

    markdownView.value = content;
    renderMarkdownToHtml(content);
    
    showFileButton.disabled = false;
    openInDefaultButton.disabled = false;

    updateUserInterface(false);
    openLinksInDefaultBrowser();
}

const createContextMenu = () =>{
    return Menu.buildFromTemplate([
        { label: 'Open File', click(){ mainProcess.getFileFromUser(); } },
        { label: 'Show File in Folder', click: showFile, enabled: !!filePath },
        { label: 'Open in Default Editor', click: openInDefaultApplication, enabled: !!filePath },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Select', role: 'selectall' }
    ]);
}
