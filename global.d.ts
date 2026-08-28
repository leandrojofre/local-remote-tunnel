import { JQuery } from 'jquery';
import SwalDefault from 'sweetalert2';

declare global {
    var $: JQuery;
    var $app: JQuery<HTMLDivElement>;
    var toastr: toastr;
    var Swal: typeof SwalDefault;
    var route: typeof import('./client/src/main').route;

    type HTMLTemplateGetOptions = {
        clone?: boolean;
    };

    namespace DB {
        type FileRow = {
            id: number;
            filename: string;
            originalname: string;
            size: number;
            mtime: number;
            extension: string;
            timestamp: number;
        };
    };

    namespace FileManagerSpace {
        type FetchOptions = {
            type?: string;
            all?: boolean;
            limit?: number;
            page?: number;
        };

        type CreateOptions = {
            fromText?: boolean;
            filename?: string;
            args?: Object;
        };

        type FileData = {
            filename?: string;
            originalname?: string;
            url?: string;
        }
    };
}


export {};