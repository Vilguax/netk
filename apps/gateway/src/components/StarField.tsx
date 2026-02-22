"use client";

export function StarField() {
  return (
    <>
      <div className="stars-container">
        <div className="stars stars-small" />
        <div className="stars stars-medium" />
        <div className="stars stars-large" />
      </div>

      <style jsx>{`
        .stars-container {
          position: fixed;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .stars {
          position: absolute;
          width: 200%;
          height: 200%;
          background-repeat: repeat;
          animation: move-stars linear infinite;
        }

        .stars-small {
          background-image: radial-gradient(1px 1px at 20px 30px, white, transparent),
                            radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
                            radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
                            radial-gradient(1px 1px at 90px 40px, white, transparent),
                            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
                            radial-gradient(1px 1px at 160px 120px, white, transparent);
          background-size: 200px 200px;
          animation-duration: 150s;
          opacity: 0.4;
        }

        .stars-medium {
          background-image: radial-gradient(1.5px 1.5px at 100px 50px, #60a5fa, transparent),
                            radial-gradient(1.5px 1.5px at 200px 150px, white, transparent),
                            radial-gradient(1.5px 1.5px at 300px 250px, #818cf8, transparent),
                            radial-gradient(1.5px 1.5px at 400px 100px, white, transparent);
          background-size: 400px 400px;
          animation-duration: 100s;
          opacity: 0.5;
        }

        .stars-large {
          background-image: radial-gradient(2px 2px at 150px 100px, #22d3ee, transparent),
                            radial-gradient(2px 2px at 350px 300px, white, transparent),
                            radial-gradient(2.5px 2.5px at 250px 200px, #a78bfa, transparent);
          background-size: 500px 500px;
          animation-duration: 80s;
          opacity: 0.6;
        }

        @keyframes move-stars {
          from {
            transform: translateY(0) translateX(0);
          }
          to {
            transform: translateY(-50%) translateX(-25%);
          }
        }
      `}</style>
    </>
  );
}
