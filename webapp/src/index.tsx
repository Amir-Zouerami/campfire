import { CampfirePlugin } from './plugin';
import './styles/globals.css';

const pluginID = 'dev.zouerami.campfire';

if (window.registerPlugin !== undefined) {
	window.registerPlugin(pluginID, new CampfirePlugin());
}
