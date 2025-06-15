import { ComponentLoader } from 'adminjs'

const componentLoader = new ComponentLoader()

const Components = {
    GeniusTool: componentLoader.add('GeniusTool', './GeniusTool'),
    // other custom components
}

export { componentLoader, Components }