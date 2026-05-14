import { CampfirePlugin } from './plugin';
import './styles/globals.css';

const pluginID = 'dev.zouerami.campfire';

if (window.registerPlugin) {
	window.registerPlugin(pluginID, new CampfirePlugin());
}
