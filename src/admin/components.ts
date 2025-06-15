import { ComponentLoader } from 'adminjs'

const componentLoader = new ComponentLoader()

const Components = {
    GeniusTool: componentLoader.add('GeniusTool', './GeniusTool'),
    Arena: componentLoader.add("Arena", "./ArenaTool")
    // other custom components
}

export { componentLoader, Components }