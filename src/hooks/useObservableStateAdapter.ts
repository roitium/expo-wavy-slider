import { useEffect } from 'react'
import {
	isSharedValue,
	startMapper,
	stopMapper,
	useSharedValue,
	type SharedValue,
} from 'react-native-reanimated'

import { isObservableState } from '../utils/serializeObservableState'

import useNativeState, { type ObservableState } from './useNativeState'

export type ObservableStateAdapterInput<T> = ObservableState<T> | SharedValue<T>

export function isWavySliderAnimatedValue<T>(
	value: unknown,
): value is ObservableStateAdapterInput<T> {
	return isObservableState<T>(value) || isSharedValue<T>(value)
}

export default function useObservableStateAdapter<T>(
	value: ObservableStateAdapterInput<T> | null | undefined,
	initialValue: T,
): ObservableState<T> | undefined {
	const sharedValueAdapter = useNativeState(initialValue)
	const isActive = useSharedValue(false)

	useEffect(() => {
		if (!value || isObservableState<T>(value)) return

		isActive.set(true)

		const mapperId = startMapper(() => {
			'worklet'
			if (!isActive.value) return

			const nextValue = value.value
			if (nextValue === undefined) return

			// oxlint-disable-next-line react-compiler/react-compiler -- ObservableState is a native shared object; writing .value updates Compose without a React state mutation.
			sharedValueAdapter.value = nextValue
		}, [value, isActive])

		return () => {
			isActive.set(false)
			stopMapper(mapperId)
		}
	}, [sharedValueAdapter, value, isActive])

	if (!value) return undefined
	if (isObservableState<T>(value)) return value
	return sharedValueAdapter
}
