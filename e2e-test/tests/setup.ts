import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env file in the e2e-test directory
config({ path: path.resolve(__dirname, '../.env') })
