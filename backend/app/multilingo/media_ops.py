import logging
import os

logger = logging.getLogger(__name__)


def extract_audio_from_video(video_path: str, audio_path: str) -> None:
    from moviepy.editor import VideoFileClip

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    logger.info("Extracting audio from: %s", os.path.basename(video_path))

    with VideoFileClip(video_path) as video:
        if not video.audio:
            raise ValueError("Video file contains no audio track")
        logger.info("Video duration: %.2fs", video.duration)
        video.audio.write_audiofile(audio_path)

    if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 1000:
        raise ValueError("Audio extraction failed or resulted in empty file")
    logger.info("Audio extracted: %.2f MB", os.path.getsize(audio_path) / (1024 * 1024))


def replace_video_audio(video_path: str, new_audio_path: str, output_path: str) -> None:
    import numpy as np
    from moviepy.editor import AudioFileClip, VideoFileClip, concatenate_audioclips

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    if not os.path.exists(new_audio_path):
        raise FileNotFoundError(f"Audio file not found: {new_audio_path}")

    logger.info("Muxing new audio into video...")

    video = VideoFileClip(video_path)
    new_audio = AudioFileClip(new_audio_path)
    final_video = None

    try:
        logger.info("Video %.2fs, audio %.2fs", video.duration, new_audio.duration)

        if new_audio.duration > video.duration:
            new_audio = new_audio.subclip(0, video.duration)
            logger.info("Audio trimmed to video length")
        elif new_audio.duration < video.duration:
            loops_needed = int(np.ceil(video.duration / new_audio.duration))
            new_audio = concatenate_audioclips([new_audio] * loops_needed).subclip(0, video.duration)
            logger.info("Audio looped %s times", loops_needed)

        final_video = video.set_audio(new_audio)
        final_video.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile="temp-audio.m4a",
            remove_temp=True,
        )
    finally:
        for clip in (final_video, new_audio, video):
            if clip is not None:
                try:
                    clip.close()
                except Exception:
                    pass

    if not os.path.exists(output_path) or os.path.getsize(output_path) < 10000:
        raise ValueError("Video creation failed or corrupted file")
    logger.info("Output video: %.2f MB", os.path.getsize(output_path) / (1024 * 1024))
