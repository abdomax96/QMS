/**
 * Cryptographic Utilities
 * أدوات التشفير الآمنة
 * 
 * Uses Web Crypto API for secure encryption
 * Replaces the weak XOR "encryption" in security.ts
 */

// ==================== Constants ====================

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

// ==================== Key Derivation ====================

/**
 * Derive a cryptographic key from a password using PBKDF2
 */
async function deriveKey(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive the actual encryption key
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as any,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

// ==================== Encryption ====================

/**
 * Encrypt data using AES-GCM
 * @param data - Plain text to encrypt
 * @param password - Password for encryption
 * @returns Base64 encoded string: salt + iv + ciphertext
 */
export async function encryptData(data: string, password: string): Promise<string> {
    try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        // Generate random salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

        // Derive key from password
        const key = await deriveKey(password, salt);

        // Encrypt
        const ciphertext = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv },
            key,
            dataBuffer
        );

        // Combine salt + iv + ciphertext
        const combined = new Uint8Array(
            salt.length + iv.length + ciphertext.byteLength
        );
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

        // Return as base64
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Base64 encoded encrypted string
 * @param password - Password for decryption
 * @returns Decrypted plain text
 */
export async function decryptData(encryptedData: string, password: string): Promise<string> {
    try {
        // Decode from base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

        // Extract salt, iv, and ciphertext
        const salt = combined.slice(0, SALT_LENGTH);
        const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

        // Derive key from password
        const key = await deriveKey(password, salt);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv },
            key,
            ciphertext
        );

        // Decode to string
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
}

// ==================== Hashing ====================

/**
 * Generate SHA-256 hash of data
 */
export async function hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate HMAC-SHA256
 */
export async function hmacSign(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(data)
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify HMAC-SHA256 signature
 */
export async function hmacVerify(
    data: string,
    signature: string,
    secret: string
): Promise<boolean> {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );

    const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    return crypto.subtle.verify(
        'HMAC',
        key,
        signatureBuffer,
        encoder.encode(data)
    );
}

// ==================== Random Generation ====================

/**
 * Generate cryptographically secure random string
 */
export function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues, v => chars[v % chars.length]).join('');
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Generate secure CSRF token
 */
export function generateCSRFToken(): string {
    return generateRandomString(32);
}

// ==================== Password Utilities ====================

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
} {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('يجب أن تكون 8 أحرف على الأقل');

    if (password.length >= 12) score++;

    if (/[a-z]/.test(password)) score++;
    else feedback.push('يجب أن تحتوي على حرف صغير');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('يجب أن تحتوي على حرف كبير');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('يجب أن تحتوي على رقم');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    else feedback.push('يجب أن تحتوي على رمز خاص');

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
        score--;
        feedback.push('تجنب الأحرف المتكررة');
    }

    if (/^(123|abc|qwerty|password)/i.test(password)) {
        score--;
        feedback.push('تجنب الأنماط الشائعة');
    }

    return {
        score: Math.max(0, Math.min(score, 6)),
        feedback,
        isStrong: score >= 4 && feedback.length === 0
    };
}

// ==================== Data Integrity ====================

/**
 * Generate checksum for data integrity verification
 */
export async function generateChecksum(data: any): Promise<string> {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return hashData(jsonString);
}

/**
 * Verify data against checksum
 */
export async function verifyChecksum(data: any, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await generateChecksum(data);
    return actualChecksum === expectedChecksum;
}

// ==================== Export Default ====================

export default {
    encryptData,
    decryptData,
    hashData,
    hmacSign,
    hmacVerify,
    generateRandomString,
    generateUUID,
    generateCSRFToken,
    checkPasswordStrength,
    generateChecksum,
    verifyChecksum
};













