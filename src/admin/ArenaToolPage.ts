import 'dotenv/config'
import {logger as loggerConstructor} from '../modules/logger.ts'

const logger = await loggerConstructor()
import { componentLoader, Components } from './components.ts'



export const page = {
  label: 'Arena',
  component: Components.Arena
}

export default page;