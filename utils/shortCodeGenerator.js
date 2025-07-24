const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MAX_ATTEMPTS = 10;

async function generateShortCode(db, length = 6) {
    for( let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
        let result = '';
        for( let i=0 ; i< length; i++) {
            result += chars.charAt(Math.floor(Math.random()* chars.length));
        }
        const [existing] = await db.query('SELECT id FROM urls WHERE short_code=?', [result]);
        if(existing.length === 0) return result;
    }
    throw new Error('Failed to generate unique short code after maximum attempts');
}

module.exports = generateShortCode;
