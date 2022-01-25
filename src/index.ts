import {setupDevtools} from './devtools';

export * from './devtools';

export default {
	install(app, options: { vueVersion: 2 | 3 } = {vueVersion : 3}) {
		setupDevtools(app, options.vueVersion);
	}
};
