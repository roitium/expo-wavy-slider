import { WavySlider } from 'expo-wavy-slider'
import type { WavySliderThumbShape } from 'expo-wavy-slider'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
	Pressable,
	ScrollView,
	StyleSheet,
	StatusBar,
	Text,
	View,
} from 'react-native'
import {
	useAnimatedReaction,
	useDerivedValue,
	useFrameCallback,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View style={styles.section}>
			<Text style={styles.title}>{title}</Text>
			{children}
		</View>
	)
}

function BasicSlider() {
	const [value, setValue] = useState(0.35)

	const handleValueChange = useCallback((nextValue: number) => {
		'worklet'
		scheduleOnRN(setValue, nextValue)
	}, [])

	return (
		<Section title='Controlled by React state'>
			<WavySlider
				style={styles.slider}
				value={value}
				bufferedValue={0.72}
				waveLength={18}
				waveHeight={12}
				waveVelocity={12}
				waveThickness={4}
				trackThickness={4}
				colors={pinkColors}
				onValueChange={handleValueChange}
			/>
			<Text style={styles.caption}>{Math.round(value * 100)}%</Text>
		</Section>
	)
}

function PlayerLikeSlider() {
	const [playing, setPlaying] = useState(true)
	const [timeLabel, setTimeLabel] = useState('0:42 / 3:00')
	const duration = useSharedValue(180)
	const position = useSharedValue(42)
	const progress = useDerivedValue(() => position.value / duration.value)
	const bufferedProgress = useSharedValue(0.76)
	const playingValue = useSharedValue(true)
	const dragging = useSharedValue(false)
	const scrubPosition = useSharedValue(42)
	const waveHeight = useSharedValue(8)
	const waveVelocity = useSharedValue(16)
	const waveThickness = useSharedValue(4)
	const trackThickness = useSharedValue(4)

	useEffect(() => {
		playingValue.set(playing)
	}, [playing, playingValue])

	useFrameCallback((frame) => {
		'worklet'
		if (!playingValue.value || dragging.value) return
		const delta = (frame.timeSincePreviousFrame ?? 0) / 1000
		const nextPosition = position.value + delta
		position.set(nextPosition >= duration.value ? 0 : nextPosition)
	})

	useAnimatedReaction(
		() => [playingValue.value, dragging.value] as const,
		([isPlaying, isDragging]) => {
			waveHeight.set(
				withTiming(isPlaying && !isDragging ? 8 : 0, {
					duration: isDragging ? 120 : 300,
				}),
			)
			waveVelocity.set(
				withTiming(isPlaying ? 16 : 0, {
					duration: isPlaying ? 150 : 100,
				}),
			)
			waveThickness.set(withTiming(isDragging ? 12 : 4, { duration: 180 }))
			trackThickness.set(withTiming(isDragging ? 12 : 4, { duration: 180 }))
		},
	)

	useAnimatedReaction(
		() => Math.trunc(dragging.value ? scrubPosition.value : position.value),
		(nextPosition) => {
			const format = (seconds: number) => {
				'worklet'
				const wholeSeconds = Math.max(0, Math.trunc(seconds))
				const minutes = Math.trunc(wholeSeconds / 60)
				const rest = wholeSeconds % 60
				return `${minutes}:${rest < 10 ? '0' : ''}${rest}`
			}
			scheduleOnRN(
				setTimeLabel,
				`${format(nextPosition)} / ${format(duration.value)}`,
			)
		},
	)

	const handleValueChange = useCallback(
		(nextValue: number) => {
			'worklet'
			dragging.set(true)
			scrubPosition.set(nextValue * duration.value)
		},
		[dragging, duration, scrubPosition],
	)

	const handleValueChangeFinished = useCallback(
		(nextValue: number) => {
			'worklet'
			position.set(nextValue * duration.value)
			dragging.set(false)
		},
		[dragging, duration, position],
	)

	const handleDragStateChange = useCallback(
		(nextDragging: boolean) => {
			'worklet'
			dragging.set(nextDragging)
		},
		[dragging],
	)

	return (
		<Section title='Player progress with drag animation'>
			<View style={styles.toolbar}>
				<Pressable
					style={styles.button}
					onPress={() => {
						setPlaying((value) => !value)
					}}
				>
					<Text style={styles.buttonText}>{playing ? 'Pause' : 'Play'}</Text>
				</Pressable>
				<Text style={styles.caption}>{timeLabel}</Text>
			</View>
			<WavySlider
				style={styles.slider}
				progress={progress}
				bufferedProgress={bufferedProgress}
				waveLength={30}
				waveHeight={waveHeight}
				waveVelocity={waveVelocity}
				waveThickness={waveThickness}
				trackThickness={trackThickness}
				colors={blueColors}
				onValueChange={handleValueChange}
				onValueChangeFinished={handleValueChangeFinished}
				onDragStateChange={handleDragStateChange}
			/>
		</Section>
	)
}

const thumbShapes: WavySliderThumbShape[] = [
	'default',
	'circle',
	'square',
	'diamond',
]

function ThumbShapeSlider() {
	const [value, setValue] = useState(0.5)
	const [shapeIndex, setShapeIndex] = useState(0)
	const thumbShape = thumbShapes[shapeIndex] ?? 'default'

	useEffect(() => {
		const interval = setInterval(() => {
			setShapeIndex((index) => (index + 1) % thumbShapes.length)
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	const handleValueChange = useCallback((nextValue: number) => {
		'worklet'
		scheduleOnRN(setValue, nextValue)
	}, [])

	return (
		<Section title='Thumb shape'>
			<View style={styles.toolbar}>
				<Pressable
					style={styles.button}
					onPress={() => {
						setShapeIndex((index) => (index + 1) % thumbShapes.length)
					}}
				>
					<Text style={styles.buttonText}>Shape: {thumbShape}</Text>
				</Pressable>
				<Text style={styles.caption}>{Math.round(value * 100)}%</Text>
			</View>
			<WavySlider
				style={styles.slider}
				value={value}
				thumbShape={thumbShape}
				waveLength={24}
				waveHeight={10}
				waveVelocity={14}
				waveThickness={4}
				trackThickness={4}
				colors={greenColors}
				onValueChange={handleValueChange}
			/>
		</Section>
	)
}

function FunSlider() {
	const progress = useSharedValue(0.5)
	const time = useSharedValue(0)
	const waveLength = useSharedValue(24)
	const waveHeight = useSharedValue(10)
	const waveVelocity = useSharedValue(14)
	const waveThickness = useSharedValue(4)
	const trackThickness = useSharedValue(4)

	useFrameCallback((frame) => {
		'worklet'
		const delta = (frame.timeSincePreviousFrame ?? 0) / 1000
		time.set(time.value + delta)

		const p = 0.5 + 0.4 * Math.sin(time.value * 1.5)
		progress.set(p)

		waveLength.set(25 + 15 * Math.sin(time.value * 2.0))
		waveHeight.set(11 + 9 * Math.cos(time.value * 1.2))
		waveVelocity.set(30 * Math.sin(time.value * 0.8))
		waveThickness.set(6 + 4 * Math.sin(time.value * 2.5))
		trackThickness.set(6 + 4 * Math.cos(time.value * 1.7))
	})

	return (
		<Section title='🤪'>
			<WavySlider
				style={styles.slider}
				progress={progress}
				waveLength={waveLength}
				waveHeight={waveHeight}
				waveVelocity={waveVelocity}
				waveThickness={waveThickness}
				trackThickness={trackThickness}
				colors={purpleColors}
			/>
		</Section>
	)
}

export default function App() {
	return (
		<View style={styles.screen}>
			<StatusBar barStyle='light-content' />
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.heading}>Wavy Slider</Text>
				<BasicSlider />
				<PlayerLikeSlider />
				<ThumbShapeSlider />
				<FunSlider />
			</ScrollView>
		</View>
	)
}

const pinkColors = {
	activeTrackColor: '#ff4b7a',
	bufferedTrackColor: 'rgba(255, 75, 122, 0.28)',
	inactiveTrackColor: '#383640',
	thumbColor: '#ff4b7a',
}

const blueColors = {
	activeTrackColor: '#67d1ff',
	bufferedTrackColor: 'rgba(103, 209, 255, 0.25)',
	inactiveTrackColor: '#303846',
	thumbColor: '#67d1ff',
}

const greenColors = {
	activeTrackColor: '#67e480',
	bufferedTrackColor: 'rgba(103, 228, 128, 0.25)',
	inactiveTrackColor: '#2f3b31',
	thumbColor: '#67e480',
}

const purpleColors = {
	activeTrackColor: '#d6a3ff',
	bufferedTrackColor: 'rgba(214, 163, 255, 0.35)',
	inactiveTrackColor: '#524366',
	thumbColor: '#d6a3ff',
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#111217',
		paddingTop: StatusBar.currentHeight ?? 0,
	},
	content: {
		gap: 18,
		paddingHorizontal: 20,
		paddingVertical: 28,
	},
	heading: {
		color: '#f4f5f7',
		fontSize: 30,
		fontWeight: '700',
	},
	section: {
		gap: 10,
		paddingVertical: 16,
	},
	title: {
		color: '#f4f5f7',
		fontSize: 16,
		fontWeight: '600',
	},
	slider: {
		alignSelf: 'stretch',
		height: 34,
	},
	caption: {
		color: '#b6bac4',
		fontVariant: ['tabular-nums'],
	},
	toolbar: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
	},
	button: {
		alignItems: 'center',
		backgroundColor: '#f4f5f7',
		borderRadius: 6,
		height: 36,
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	buttonText: {
		color: '#111217',
		fontWeight: '700',
	},
})
