require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Path = require('path');
const fs = require('fs');
const os = require('os');
const vite = require('vite');

// * MARK:Variables

const dataDir = Path.join(__dirname, '..', 'data');
const clientDir = Path.join(__dirname, '..', 'client');

const port = parseInt(process.env.PORT, 10) || 6969;
const bindHost = String(process.env.HOST || '0.0.0.0');
const publicHost = String(process.env.PUBLIC_HOST || getLocalIPv4());
const protocol = 'http';

/** @type {cors.CorsOptions} */
const corsOptions = {
    origin: [
        `${protocol}://${publicHost}:${port}`,
        `http://localhost:${port}`,
    ],
};

const dataPaths = {
    root: dataDir,
    files: Path.join(dataDir, 'files'),
    db: Path.join(dataDir, 'db'),
};

for (const key in dataPaths) {
    const path = dataPaths[key];
    const isFile = path.includes('.');

    if (isFile || fs.existsSync(path)) continue;

    fs.mkdirSync(path, { recursive: true });
}

const storage = multer.diskStorage({
    destination(request, file, callback) {
        callback(null, dataPaths.files);
    },
    filename(request, file, callback) {
        const filename = `${Date.now()}-${file.originalname}`;
        callback(null, getUniqueFilename(dataPaths.files, filename));
    },
});

const { init } = require('./js/db.js');

const {
    db,
    insertOrReplace,
    insertIgnore,
    deleteByFilename,
    countStmtBase,
    selectBase,
} = init(Path.join(dataPaths.db, 'files.db'));

const uploadFile = multer({ storage });
const app = express();

// * MARK:Methods

function getLocalIPv4() {
    const iFaces = os.networkInterfaces();

    for (const dev of Object.values(iFaces)) {
        if (!dev) continue;

        for (const info of dev) {
            if (info.family === 'IPv4' && !info.internal) {
                return info.address;
            }
        }
    }

    return '127.0.0.1';
}

/**
 * @param {string} type
 * @returns {string[]}
 */
function extensionsForType(type) {
    if (!type) return null;

    type = String(type).toLowerCase();

    if (!type.includes('/')) return [type.replace(/^\./, '')];

    if (type.startsWith('image')) return ['png','jpg','jpeg','gif','bmp','webp','svg'];
    if (type.startsWith('text')) return ['txt','csv','md','json','xml','html','css','js'];
    if (type.startsWith('audio')) return ['mp3','wav','ogg','m4a','flac'];
    if (type.startsWith('video')) return ['mp4','mov','avi','webm','mkv'];
    if (type.includes('pdf')) return ['pdf'];

    const subtype = type
        .split('/')[1]
        ?.replace(/^\./, '');

    return subtype ? [subtype] : null;
}

function indexExistingFiles() {
    const names = fs.readdirSync(dataPaths.files);

    const insert = db.transaction((rows) => {
        for (const row of rows) insertIgnore.run(row);
    });

    const rows = names.map((name) => {
        try {
            const path = Path.join(dataPaths.files, name);
            const stats = fs.statSync(path);
            const extension = Path.extname(name)
                .replace(/^\./, '')
                .toLowerCase();

            const parts = name.split('-');
            const timestamp = parseInt(parts[0], 10) || stats.mtimeMs;

            return {
                filename: name,
                originalname: name.replace(/^\d+-/, ''),
                size: stats.size,
                mtime: Math.floor(stats.mtimeMs),
                extension,
                timestamp
            };
        } catch {
            return null;
        }
    }).filter(Boolean);

    if (rows.length) insert(rows);
}

function cleanupMissingFiles() {
    const allRows = db.prepare('SELECT filename FROM files').all();
    const deleteMany = db.transaction((filenames) => {
        for (const filename of filenames) deleteByFilename.run({ filename });
    });

    const missingFiles = allRows
        .map((/** @type {DB.FileRow} */row) => row.filename)
        .filter(filename => !fs.existsSync(Path.join(dataPaths.files, filename)));

    if (!missingFiles.length) return;

    deleteMany(missingFiles);
    console.log(`Cleaned up ${missingFiles.length} missing file(s) from database`);
}

function getUniqueFilename(dir, filename) {
    const ext = Path.extname(filename);
    const base = Path.basename(filename, ext);
    let unique = filename;
    let counter = 1;

    while (fs.existsSync(Path.join(dir, unique))) {
        unique = `${base} (${counter})${ext}`;
        counter += 1;
    }

    return unique;
}

// * MARK: Endpoints

app.use(cors(corsOptions));

app.use('/files', express.static(dataPaths.files));

app.get('/api', function (request, response) {
    response.json({message: 'The API for Local Tunnel is working'});
});

app.get('/api/config', (req, res) => {
    res.json({
        host: publicHost,
        port,
        protocol,
    });
});

app.get('/api/files', async (request, response) => {
    try {
        const fetchAll = String(request.query.all ?? 'false') === 'true';
        const type = request.query.type ? String(request.query.type).toLowerCase() : null;
        const extensions = extensionsForType(type);

        let whereClause = '';
        let params = {limit: -1, offset: 0};

        if (!fetchAll) {
            const limit = Math.max(1, parseInt(String(request.query.limit || 20), 10));
            const page = Math.max(1, parseInt(String(request.query.page || 1), 10));

            params = {
                limit,
                offset: (page - 1) * limit,
            };
        }

        if (extensions && extensions.length) {
            const placeholders = extensions
                .map((_, i) => `@extension${i}`)
                .join(', ');

            whereClause = `WHERE extension IN (${placeholders})`;
            extensions.forEach((e, i) => params[`extension${i}`] = e);
        }

        const rows = db.prepare(selectBase(whereClause)).all(params);
        const totalRow = db.prepare(countStmtBase(whereClause)).get(params);

        const files = rows.map((/** @type {DB.FileRow} */row) => ({
            filename: row.filename,
            originalname: row.originalname,
            size: row.size,
            mtime: row.mtime,
            extension: row.extension,
            timestamp: row.timestamp,
        }));

        response.json({
            error: false,
            total: totalRow ? totalRow['count'] : 0,
            files,
            params,
        });
    } catch (err) {
        console.error(err);
        response.status(500).json({ error: true, message: 'Failed to list files' });
    }
});

app.post('/api/file/upload', uploadFile.single('file'), function (request, response) {
    if (!request.file) return response.status(400).json({
        error: true,
        message: 'No file found',
    });

    const date = new Date();

    console.log(`File shared - ${date.toDateString()} ${date.toTimeString()}`, {
        params: request.params,
        query: request.query,
        body: request.body,
    });

    const stats = fs.statSync(request.file.path);
    const extension = Path.extname(request.file.filename).replace(/^\./, '').toLowerCase();
    const parts = request.file.filename.split('-');
    const timestamp = parseInt(parts[0], 10) || Date.now();
    const customNameRaw = String(request.body.filename || '').trim();
    const customName = customNameRaw.replace(Path.extname(customNameRaw), '');
    let filename = customName?.length ? `${customName}.${extension}` : request.file.filename;

    if (filename !== request.file.filename) {
        const oldPath = request.file.path;
        const uniqueFilename = getUniqueFilename(dataPaths.files, filename);
        const newPath = Path.join(dataPaths.files, uniqueFilename);

        fs.renameSync(oldPath, newPath);
        filename = uniqueFilename;
    }

    insertOrReplace.run({
        filename: filename,
        originalname: request.file.originalname,
        size: stats.size,
        mtime: Math.floor(stats.mtimeMs),
        extension,
        timestamp
    });

    response.json({
        error: false,
        message: 'File shared successfully',
        filename: filename,
        originalname: request.file.originalname,
        path: `${dataPaths.files}\\${encodeURIComponent(filename)}`,
    });
});

app.get('/api/file/:filename', (request, response) => {
    try {
        const filename = decodeURIComponent(request.params.filename);
        const filepath = Path.join(dataPaths.files, filename);

        if (!Path.resolve(filepath).startsWith(Path.resolve(dataPaths.files))) {
            return response.status(400).json({ error: true, message: 'Invalid filename' });
        }

        if (!fs.existsSync(filepath)) {
            deleteByFilename.run({ filename });
            return response.status(404).json({ error: true, message: 'File not found' });
        }

        response.download(filepath, filename);
    } catch (err) {
        console.error(err);
        response.status(500).json({ error: true, message: 'Failed to download file' });
    }
});

app.delete('/api/file/:filename', (request, response) => {
    try {
        const filename = decodeURIComponent(request.params.filename);
        const filepath = Path.join(dataPaths.files, filename);

        if (!Path.resolve(filepath).startsWith(Path.resolve(dataPaths.files))) {
            return response.status(400).json({ error: true, message: 'Invalid filename' });
        }

        if (!fs.existsSync(filepath)) {
            return response.status(404).json({ error: true, message: 'File not found' });
        }

        fs.unlinkSync(filepath);
        deleteByFilename.run({ filename });

        response.json({
            error: false,
            message: 'File deleted successfully',
            filename: filename,
        });
    } catch (err) {
        console.error(err);
        response.status(500).json({ error: true, message: 'Failed to delete file' });
    }
});

app.listen(port, bindHost, async function () {
    indexExistingFiles();
    console.log('[1/3] Files indexed...');

    cleanupMissingFiles();
    console.log('[2/3] Missing dependencies cleared...');
    console.log('[3/3] Setting up Frontend server...');

    const viteServer = await vite.createServer({
        server: { middlewareMode: true },
        root: clientDir,
    });

    app.use(viteServer.middlewares);
    console.log(`${protocol.toUpperCase()} server running at ${protocol}://${publicHost}:${port}`);
});

// * MARK:Exports

module.exports = {
    dataPaths,
};