import { installOnUIRuntime } from 'expo'
/*
  huge thx to expo-ui
  inspired by https://github.com/expo/expo/blob/main/packages/expo-ui/src/State/index.fx.ts
*/
import Constants from 'expo-constants'

import { worklets } from './utils/ensureWorklets'
import {
	EXPO_SHARED_OBJECT_ID_KEY,
	isWavySliderSharedObject,
	type WavySliderSharedObject,
} from './utils/sharedObjectBrand'

type PackedSharedObject = { objectId: number }

let serializerRegistered = false

function registerSharedObjectSerializer(): void {
	if (serializerRegistered || !worklets) return

	serializerRegistered = true
	worklets.registerCustomSerializable<
		WavySliderSharedObject,
		PackedSharedObject
	>({
		name: 'ExpoWavySliderSharedObject',
		determine: (value): value is WavySliderSharedObject => {
			'worklet'
			return isWavySliderSharedObject(value)
		},
		pack: (value) => {
			'worklet'
			return { objectId: value[EXPO_SHARED_OBJECT_ID_KEY] }
		},
		unpack: (packed) => {
			'worklet'
			const sharedObject = (
				globalThis as typeof globalThis & {
					expo: {
						SharedObject: {
							__resolveInWorklet(id: number): {
								getValue?: () => unknown
								setValue?: (value: { value: unknown }) => void
							}
						}
					}
				}
			).expo.SharedObject
			// eslint-disable-next-line no-underscore-dangle
			const obj = sharedObject.__resolveInWorklet(packed.objectId)

			if (
				typeof obj.getValue === 'function' &&
				typeof obj.setValue === 'function'
			) {
				Object.defineProperty(obj, 'value', {
					get() {
						return obj.getValue?.()
					},
					set(value: unknown) {
						if (value === undefined) return

						obj.setValue?.({ value })
					},
				})
			}

			return obj as unknown as WavySliderSharedObject
		},
	})
}

const sdkVersion = Number.parseInt(Constants.expoConfig?.sdkVersion ?? '0', 10)

// https://github.com/expo/expo/commit/4b0895538a277eaed151272d1be029b3708e0181
if (sdkVersion >= 57) {
	// ponytail: expo SDK 57+ passes the runtime holder; cast needed for SDK 56 dev types
	;(installOnUIRuntime as (holder: unknown) => void)(
		worklets.getUIRuntimeHolder(),
	)
} else {
	/*
	  `installOnUIRuntime()` currently depends on the runtime pointer exposed via
	  `_WORKLET_RUNTIME`. In practice that value is installed by Reanimated's
	  runtime decorator, so this package requires Reanimated even though the direct
	  worklet APIs come from `react-native-worklets`.
	  https://github.com/software-mansion/react-native-reanimated/blob/cfb12d0f747ad189d2ff7717b0774de8ec6f9897/packages/react-native-reanimated/Common/cpp/reanimated/RuntimeDecorators/RNRuntimeDecorator.cpp#L20
	*/
	try {
		// oxlint-disable-next-line
		require('react-native-reanimated')
	} catch {
		throw new Error(
			'[expo-wavy-slider] react-native-reanimated is required. Please install it first.',
		)
	}
	installOnUIRuntime()
}

registerSharedObjectSerializer()
