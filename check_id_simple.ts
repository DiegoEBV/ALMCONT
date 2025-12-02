
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    const url = envConfig.VITE_SUPABASE_URL
    if (url) {
        const urlObj = new URL(url)
        const hostParts = urlObj.hostname.split('.')
        console.log(hostParts[0])
    }
}
