"use client"; // NextJS 13 requires this. Remove if you are using NextJS 12 or lower
import Script from "next/script";

const FeedbackWidget = () => {
  return (
    <>
      <Script src="https://w.appzi.io/w.js?token=bvDTF"  />
    </>
  );
};

export default FeedbackWidget;