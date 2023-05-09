import type { CustomIDsConstant } from "./types";

export const ApplyCustomIDs: CustomIDsConstant = Object.freeze({
    buttons: {
        cancel: 'application-cancel',
        done: 'application-done',
        answer: 'application-answer',
    },
    modals: {
        answer: 'application-answer'
    },
    selects: {
        edit: 'application-question-select'
    }
});

export const ApplicationCustomIDs: CustomIDsConstant  = Object.freeze({
    buttons: {
        deny: 'decide-deny',
        accept: 'decide-accept',
        decide: 'decide',
        paginate: 'paginate',
        page: 'page_num'
    },
    selects: {
        list: 'application-list'
    },
    modals: {
        decide: 'decide'
    }
});

export const QuestionCustomIDs: CustomIDsConstant  = Object.freeze({
    buttons: {
        edit: 'question-edit',
        delete: 'question-delete',
        // TODO
        page: ''
    },
    modals: {
        edit: 'question-edit'
    }
});
