import {setupDevtoolsPlugin} from '@vue/devtools-api';
import {App} from "@vue/devtools-api/lib/esm/api";
import {CustomInspectorNode} from "@vue/devtools-api/lib/esm/api/api";
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
				const storeKey  = payload.nodeId;
				const storeInst = Object.getPrototypeOf(app[storeKey]);
				const store     = Object.getPrototypeOf(app)[storeKey];

				const states = {
					'methods' : [],
					'getters' : [],
				};

				const descriptors = Object.getOwnPropertyDescriptors(storeInst);

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

				payload.state = {
					'1. State: ' : Object.keys(store.state).map(key => ({
						key        : key,
						value      : store.state[key],
						objectType : 'reactive',
					})),
					'Methods'    : states['methods'],
					'Getters'    : states['getters'],


				};

			}
		});

	});
}


function getStores(app) {
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
