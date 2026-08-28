import $ from 'jquery';
import toastr from 'toastr';
import _Swal from 'sweetalert2';

import 'sweetalert2/themes/bulma.css';
import 'toastr/build/toastr.css';

import { FileManager } from './assets/classes/FileManager.js';
import * as moduleNoteSharing from './assets/modules/note_sharing.js';
import * as moduleFileSharing from './assets/modules/file_sharing.js';

export {
    HTML_TEMPLATES,
    FILE_MANAGER,
    CLIPBOARD,
    CACHE_STORAGE,
    route
};

const Swal = _Swal.mixin({
    theme: 'bulma-light',
    confirmButtonText: 'Confirm',
});

Object.assign(globalThis, {
    $,
    $app: $('#app'),
    toastr,
    Swal,
    _Swal,
    route,
});

const FILE_MANAGER = new FileManager();
const CACHE_STORAGE = {
    /**
     * @param {string} key
     * @param {any} value
     */
    set(key, value) {
        try {
            const valueParsed = JSON.stringify(value);
            localStorage.setItem(key, valueParsed);
        } catch (error) {
            if (typeof value === 'string') localStorage.setItem(key, value);
        }
    },

    /**
     * @param {string} key
     * @returns {any}
     */
    get(key) {
        return parseString(localStorage.getItem(key));
    },
}

const CLIPBOARD = {
    hasPermission: false,

    async init() {
        const warnings = CACHE_STORAGE.get('warnings') ?? {};

        // @ts-ignore
        await navigator.permissions.query({ name: 'clipboard-write' }).then((result) => {
            if (result.state === 'granted') {
                CLIPBOARD.hasPermission = true;
            }
        });

        if (!CLIPBOARD.hasPermission && !warnings?.clipboardPermission) {
            toastr.error('The page doesn\'t have clipboard access', 'Clipboard');
            CACHE_STORAGE.set('warnings', {clipboardPermission: true, ...warnings});
        }
    },

    /**
     * @param {string} text
     * @param {Object} [options]
     * @param {JQuery} [options.selectionFallback]
     */
    set(text, {selectionFallback = null} = {}) {
        if (!CLIPBOARD.hasPermission) {
            if (!selectionFallback) return;

            const selection = window.getSelection();

            if (selection.rangeCount > 0) {
                selection.removeAllRanges();
            }

            const range = document.createRange();
            range.selectNode(selectionFallback[0]);
            selection.addRange(range);

            return;
        };

        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            console.log(`Text copied to clipboard: ${text}`);
        }).catch(err => {
            console.error('Failed to copy:', err);
            toastr.error('Failed to copy text', 'Clipboard');
        });
    },
};

const HTML_TEMPLATES = {
	/**
     * @template T
     * @param {string} [fileName]
     * @param {HTMLTemplateGetOptions} [options]
     * @returns {Promise<JQuery<T>>}
     */
    async get(fileName = 'settings', {clone = false} = {}) {
		if (!HTML_TEMPLATES[fileName]) {
			try {
				await $
                .get(`src/templates/${fileName}.html`)
                .done(function(response) {
                    HTML_TEMPLATES[fileName] = $(response);
                });
			} catch (err) {
                console.error(err);
			}
        }

        const $file = HTML_TEMPLATES[fileName];

        if (!$file) return $();

		return clone ? $file.clone() : $file;
    },
};

let backendURL = null;

const backendEndpoints = {
    root: 'api/',
    config: 'api/config/',
    files: 'api/files/',
    fileFetch: 'api/file/::filename/',
    fileUpload: 'api/file/upload/',
};

// * MARK:Methods

/**
 * @param {keyof backendEndpoints} endpoint
 * @param {Object} [extra] Extra request parameters
 * @returns {string}
 */
function route(endpoint, extra = {}) {
    return `${backendURL}${backendEndpoints[endpoint]}`
        .replace(/::(\w+)\//g, function (match, name) {
            return name in extra ? extra[name] + '/' : '';
        });
}

/**
 * @param {string} text
 * @returns {any}
 */
function parseString(text) {
    if (['true', 'false'].includes(text)) return text === 'true';
    if (!isNaN(Number(text)) && text?.length) return Number(text);

    try {
        return JSON.parse(text);
    } catch (error) {
        return text;
    }
}

async function loadBackendConfig() {
    const res = await fetch(backendEndpoints.config);
    const config = await res.json();
    backendURL = `${config.protocol}://${config.host}:${config.port}/`;
}

// MARK:Ready

async function ready() {
    toastr.options.progressBar = true;

    await loadBackendConfig();
    await CLIPBOARD.init();
    await moduleNoteSharing.init();
    await moduleFileSharing.init();
}

$(ready);