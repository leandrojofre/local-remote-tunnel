import {
    HTML_TEMPLATES,
    route,
} from '../../main.js';

export {
    FileManager,
};

const defFetchOptions = {
    type: '',
    all: false,
    limit: 20,
    page: 0
};

class FileManager {
    /** @property @type {DB.FileRow[]} */ files;

    constructor () {
        this.files = [];
    }

    /**
     * @param {string|File} input
     * @param {FileManagerSpace.CreateOptions} [options]
     * @returns {File}
     */
    create(input, {fromText = false, filename = 'file.txt', args = {}} = {}) {
        const isInputText = typeof input === 'string';
        let file = input instanceof File ? input : null;

        if (fromText && isInputText) file = new File ([input], filename, {
            lastModified: Date.now(),
            type: 'text/plain',
            ...args
        });

        return file;
    }

    /**
     * @param {FileManagerSpace.FetchOptions} [options]
     * @returns {Promise<DB.FileRow[]>}
     */
    async sync(options = {}) {
        const manager = this;
        const data = Object.assign({}, structuredClone(defFetchOptions), options);

        console.log(data);

        await $.ajax({
            url: route('files'),
            data,
            method: 'GET',
            success(response) {
                if (response.error)
                    return toastr.error(response.message || 'Files could not be synced', 'File Manager');

                manager.files = response.files;
                console.log({
                    files: manager.files,
                    response,
                });
            },
            error(err) {
                const {responseJSON: data} = err;
                manager.files = [];
                toastr.error(data?.message || 'Files could not be synced', 'File Manager');
                console.log(err);
            }
        });

        return this.files;
    }

    /**
    * @param {string} filename
    * @returns {Promise<File>}
    */
    async fetch(filename) {
        return await $.ajax({
            url: route('fileFetch', {filename}),
            method: 'GET',
            xhrFields: {
                responseType: 'blob'
            },
            success(blob) {
                return new File([blob], filename);
            },
            error(err) {
                toastr.error('Failed to fetch file', 'File Manager');
                console.error(err);
                return null;
            }
        });
    }

    /**
     * @param {string} filename
     * @returns {Promise<boolean>}
     */
    async delete(filename) {
        return await $.ajax({
            url: route('fileFetch', {filename}),
            method: 'DELETE',
            success(response) {
                if (response.error)
                    return toastr.error(response.message, 'File Manager');

                toastr.success(response.message, 'File Manager');
                console.log(response);
                return true;
            },
            error(err) {
                const {responseJSON: data} = err;
                toastr.error(data?.message || `File could not be deleted: ${filename}`, 'File Manager');
                console.log(err);
                return false;
            }
        });
    }
}