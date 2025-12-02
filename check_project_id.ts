
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    const url = envConfig.VITE_SUPABASE_URL
    if (url) {
        try {
            const urlObj = new URL(url)
            const hostParts = urlObj.hostname.split('.')
            if (hostParts.length > 0) {
                console.log('Current Supabase Project ID:', hostParts[0])
                console.log('Full URL (masked):', url.replace(hostParts[0], '********'))
            } else {
                console.log('Could not parse Project ID from URL:', url)
            }
        } catch (e) {
            console.log('Invalid URL format:', url)
        }
    } else {
        console.log('VITE_SUPABASE_URL not found in .env')
    }
} else {
    console.log('.env file not found')
}
