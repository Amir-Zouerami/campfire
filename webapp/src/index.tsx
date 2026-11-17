import './shared/ui/styles/index.css';

import { CampfirePlugin } from './plugin/CampfirePlugin';

const PLUGIN_ID = 'dev.zouerami.campfire';

if (window.registerPlugin !== undefined) {
	window.registerPlugin(PLUGIN_ID, new CampfirePlugin());
}
