import dotenv from "dotenv"; dotenv.config({path: (!process.env.dotenv ? undefined : process.env.dotenv)});
import {logger as loggerConstructor} from '../modules/logger'

const logger = await loggerConstructor()
import { componentLoader, Components } from './components'



export const page = {
  label: 'Arena',
  component: Components.Arena
}

export default page;