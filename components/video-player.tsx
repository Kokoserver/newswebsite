type VideoPlayerProps = {
  src: string;
  poster?: string | null;
  title?: string | null;
  caption?: string | null;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
};

export default function VideoPlayer({
  src,
  poster,
  title,
  caption,
  controls = true,
  autoPlay = false,
  loop = false,
  className,
}: VideoPlayerProps) {
  return (
    <div className="video-player">
      <video
        className={className}
        controls={controls}
        controlsList="nodownload noplaybackrate nopictureinpicture nofullscreen"
        disablePictureInPicture
        autoPlay={autoPlay}
        muted={autoPlay}
        loop={loop}
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        aria-label={title ?? caption ?? "Video"}
      >
        <source src={src} />
        Your browser does not support playing this video.
      </video>
      {caption ? <p className="video-player-caption">{caption}</p> : null}
    </div>
  );
}
