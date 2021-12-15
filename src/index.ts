import {setupDevtools} from './devtools';

export * from './devtools';

export default {
	install(app, options = {}) {
		setupDevtools(app);
	}
};
