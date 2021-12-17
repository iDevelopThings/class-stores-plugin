import {setupDevtoolsPlugin} from '@vue/devtools-api';
import {App} from "@vue/devtools-api/lib/esm/api";
import {CustomInspectorNode} from "@vue/devtools-api/lib/esm/api/api";
import {StateBase} from "@vue/devtools-api/lib/esm/api/component";
import _ from "lodash";

const inspectorId = 'vue-class-stores-plugin';


export function setupDevtools(app: App) {
	setupDevtoolsPlugin({
		id          : 'vue-class-stores-plugin',
		label       : 'Vue Class Stores',
		packageName : 'vue-class-stores-plugin',
		app
	}, api => {

		api.addInspector({
			id    : inspectorId,
			label : 'Class Stores',
			icon  : 'receipt_long',
		});

		api.on.getInspectorTree((payload, context) => {
			if (payload.inspectorId === inspectorId) {
				const stores = getStores(app);

				payload.rootNodes = [];

				for (let storeDef of stores) {
					const node: CustomInspectorNode = {
						id    : storeDef.key,
						label : _.startCase(_.toLower(storeDef.key)),
						tags  : [
							{
								label           : storeDef.key,
								textColor       : 0x000000,
								backgroundColor : 0xff984f
							}
						]
					};

					payload.rootNodes.push(node);
				}
			}
		});

		api.on.getInspectorState((payload, context) => {
			if (payload.inspectorId === inspectorId) {
				const storeKey = payload.nodeId;

				const states = getStoreStates(app, storeKey);

				payload.state = {
					'1. State: ' : states['state'],
					'2. Getters' : states['getters'],
					'3. Methods' : states['methods'],
				};

			}
		});

	});
}


function getStores(app) {
	const version = getVueVersion(app);

	return version === 2 ? getVueTwoStores(app) : getVueThreeStores(app);
}

function getVueTwoStores(app) {
	const appProto = Object.getPrototypeOf(app);

	const storeKeys = Object.keys(appProto)
		.filter(key => key.startsWith("$"))
		.filter(key => {
			const val = appProto[key];

			if (!val) {
				return false;
			}

			if (!val.hasOwnProperty('state')) {
				return false;
			}

			if (val.state.__ob__ === undefined) {
				return false;
			}

			return true;
		});

	return storeKeys.map(key => {
		return {store : appProto[key], key};
	});
}

function getVueThreeStores(app) {
	const storeKeys = Object.keys(app.config.globalProperties)
		.filter(key => key.startsWith("$"))
		.filter(key => {
			const val = app.config.globalProperties[key];

			if (!val) {
				return false;
			}

			if (!val.hasOwnProperty('state')) {
				return false;
			}

			return true;
		});


	return storeKeys.map(key => {
		return {store : app.config.globalProperties[key], key};
	});
}

function getStoreStates(app, key: string): { [key: string]: StateBase[] } {
	const {storeInst, store} = getStoreInsts(app, key);

	const states = {
		'state'   : Object.keys(store.state).map(key => ({
			key        : key,
			value      : store.state[key],
			objectType : 'reactive',
		})),
		'methods' : [],
		'getters' : [],
	};

	const descriptors = Object.getOwnPropertyDescriptors(storeInst);

	console.log(descriptors);

	for (let key in descriptors) {
		const descriptor = descriptors[key];

		if (!descriptor || key === 'constructor') {
			continue;
		}

		if (typeof descriptor.value === 'function') {
			states['methods'].push({key, value : `${key}()`});
			continue;
		}
		if (descriptor.set === undefined && descriptor.get !== undefined) {
			let value = null;

			try {
				value = store[key];
			} catch (error) {
				value = undefined;
			}

			states['getters'].push({
				key,
				value,
				raw : value === undefined ? 'Cannot display value' : undefined
			});
			continue;
		}
	}

	return states as { [key: string]: StateBase[] };
}

function getStoreInsts(app, storeKey: string) {
	console.log(getVueVersion(app), getVueThreeStoreInsts(app, storeKey));

	return getVueVersion(app) === 2
		? getVueTwoStoreInsts(app, storeKey)
		: getVueThreeStoreInsts(app, storeKey);
}

function getVueThreeStoreInsts(app, storeKey: string) {
	return {
		storeInst : Object.getPrototypeOf(app.config.globalProperties[storeKey]),
		store     : app.config.globalProperties[storeKey],
	};
}

function getVueTwoStoreInsts(app, storeKey: string) {
	return {
		storeInst : Object.getPrototypeOf(app[storeKey]),
		store     : Object.getPrototypeOf(app)[storeKey],
	};
}


function getVueVersion(app) {
	let vueVersion = app.version;

	if (!vueVersion) {
		return app?.config?.globalProperties ? 3 : 2;
	}

	return (vueVersion as string).startsWith('3.') ? 3 : 2;
}
