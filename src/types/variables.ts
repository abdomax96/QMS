export interface DocumentVariable {
    id: string;
    company_id: string;
    name: string;
    value: string;
    unit?: string;
    description?: string;
    source_document_id?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateVariableInput {
    name: string;
    value: string;
    unit?: string;
    description?: string;
    source_document_id?: string;
    company_id?: string;
}

export interface UpdateVariableInput {
    name?: string;
    value?: string;
    unit?: string;
    description?: string;
    source_document_id?: string;
}
