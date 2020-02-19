/* eslint-disable */
import React, { useState, useEffect } from 'react';
import Gallery from './Gallery';
import DocTypeState from './DocTypeState.js';
//import {useCountdownTimer} from 'use-countdown-timer';
import useInterval from '@use-hooks/interval';
import * as mitekScienceSDK from './mitek-science-sdk';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';


// These are hints that are recommended for displaying
// to the end user during auto capture.
const autoHints = {
    MISNAP_HEAD_OUTSIDE: 'Place Face in Oval',
    MISNAP_HEAD_SKEWED: 'Look Straight Ahead',
    MISNAP_AXIS_ANGLE: 'Hold Phone Upright',
    MISNAP_HEAD_TOO_CLOSE: 'Move Farther Away',
    MISNAP_HEAD_TOO_FAR: 'Get Closer',
    MISNAP_STAY_STILL: 'Hold Still',
    MISNAP_SUCCESS: 'Success',
    MISNAP_STOP_SMILING: 'Stop Smiling',
    MISNAP_SMILE: 'Smile!',
    MISNAP_READY_POSE: 'Hold it There',
    MITEK_ERROR_GLARE: 'Reduce Glare'
};

const cvExceptions = {
    MITEK_ERROR_GLARE: 'Reduce Glare',
    MITEK_ERROR_FOUR_CORNER: 'Document not found',
    MITEK_ERROR_TOO_DARK: 'Image Too Dark',
    MITEK_ERROR_FOCUS: 'Image too Blurry',
    IMAGE_SMALLER_THAN_MIN_SIZE: 'Document too Small',
    CV_NO_BARCODE_FOUND: 'No Barcode Found',
    CORRUPT_IMAGE: 'Corrupt Image',
    MITEK_ERROR_SKEW_ANGLE: 'Document Skewed',
};


const App = () => {

    const mitekApiPath = (process.env.NODE_ENV === 'production') ?
        'https://mitek05435.mitek.dom/~tkramer/reactio/mmw421/' :
        `${process.env.PUBLIC_URL}/mmw421/`;

    const captureTimeSec = 10;
    const hintervalMsec = 500;

    // Set up hint interval.
    const [hint, setHint] = useState('Please Wait...');
    useInterval( _ => { 
        hint ? mitekScienceSDK.cmd('SHOW_HINT', hint) : mitekScienceSDK.cmd('HIDE_HINT');
    }, hintervalMsec);

    const [mode, setMode] = useState('AUTO_CAPTURE');
    const [subject, setSubject] = useState('DL_FRONT');

    const [gallery, setGallery] = useState({
        captures: Array(3).fill({
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            docType: '',
            mibiData: {},
            decodedStr: '',
        })
    });

    const handleResult = result => {
        
        setHint(null);
        const capturesArr = [...gallery.captures];

        const freeidx = capturesArr.findIndex(item => '' === item.docType);

        capturesArr[freeidx] = {
            image: result.response.imageData,
            docType: result.response.docType,
            mibiData: result.response.mibiData,
            decodedStr: result.response.code,
        };
        console.log('capturesMut', capturesArr);
        setGallery({ captures: capturesArr });
    };

    const stopAutoCapture = _ => {
        mitekScienceSDK.cmd('SDK_STOP');
    };

    const startAutoCapture = e => {
        const el = document.querySelector('div video[autoplay="true"]');
        el.parentNode.setAttribute('z-index', '0');
        el.play().then(()=> null).catch(()=>null);

        // camera started
        mitekScienceSDK.on('CAMERA_DISPLAY_STARTED', result => {

            if (subject === 'SELFIE') {
                setHint('Please wait...');
            }
        });

        // frames started processing
        mitekScienceSDK.on('FRAME_PROCESSING_STARTED', e => {
            setTimeout(_ => stopAutoCapture(), captureTimeSec * 1000);
        });

        // frame captured
        mitekScienceSDK.on('FRAME_CAPTURE_RESULT', handleResult);

        // SDK error
        mitekScienceSDK.on('SDK_ERROR', err => {
            console.log('sdk FAIL', err);
            setHint(null);
            alert(`SDK_ERROR: ${JSON.stringify(err)}`);
        });

        // CAPTURE FEEDBACK CHANNEL: during capture, feedback for frames that...i.e. Hint Messages
        mitekScienceSDK.on('FRAME_PROCESSING_FEEDBACK', status => {

            setHint( autoHints.hasOwnProperty(status.key) ? autoHints[status.key] : null );

            if (subject === 'SELFIE') {
                let divFace = document.body.getElementsByClassName('integrator SELFIE');
                // turn oval green if head is in guide
                if (status.key === 'MISNAP_SMILE'
                    || status.key === 'MISNAP_STOP_SMILING'
                    || status.key === 'MISNAP_READY_POSE') {
                    divFace[0].classList.add('FACE_IN_GUIDE');
                }
                else {
                    divFace[0].classList.remove('FACE_IN_GUIDE');
                }
            }
        });

        mitekScienceSDK.cmd('CAPTURE_AND_PROCESS_FRAME', {
            mode: 'AUTO_CAPTURE',
            documentType: subject,
            mitekSDKPath: mitekApiPath,
            options: {
                qualityPercent: 80,
            }
        });
    }

    const startManualCapture = e => {
        mitekScienceSDK.cmd('CAPTURE_AND_PROCESS_FRAME', {
            mode: 'MANUAL_CAPTURE',
            documentType: subject,
            mitekSDKPath: mitekApiPath,
            options: {
                qualityPercent: 80
            }
        });

        //mitekScienceSDK.on('FRAME_PROCESSING_STARTED',  );

        // What is this doing?
        mitekScienceSDK.on('FRAME_PROCESSING_FEEDBACK', result => {
            console.log('FRAME_PROCESSING_FEEDBACK', result);
        });

        mitekScienceSDK.on('FRAME_CAPTURE_RESULT', result => {
            console.log("Manual capture result", result);
            handleResult(result);
        });

        mitekScienceSDK.on('SDK_ERROR', err => {
            alert(`Manual capture error: ${err}`)
        });

    };

    const startDirectScience = () => {
        alert('Under Construction');
    };

    const zAdjust = () => {
        const el = document.querySelector('div video[autoplay="true"]');
        el.parentNode.setAttribute('style', 'z-index: 0;');
    };

    useEffect( _ => {
        zAdjust();
    }, [])

    return (
        <div className="container">
            <div className="card">
                <h3 className="card-header">MiSnap for Mobile Web SDK 4.2.1</h3>
                <div className="card-body">
                    <div className="form-check">
                        <input className="form-check-input"
                            id="autoMode"
                            type="radio"
                            name="capture-mode"
                            value="AUTO_CAPTURE"
                            checked={mode === "AUTO_CAPTURE"}
                            onChange={res => setMode(res.target.value)}
                        />
                        <label className="form-check-label" htmlFor="autoMode">Auto</label>
                    </div>
                    <div className="form-check">
                        <input className="form-check-input"
                            id="manualMode"
                            type="radio"
                            name="capture-mode"
                            value="MANUAL_CAPTURE"
                            checked={mode === "MANUAL_CAPTURE"}
                            onChange={res => setMode(res.target.value)}
                        />
                        <label className="form-check-label" htmlFor="manualMode">Manual</label>
                    </div>
                    <div className="form-check">
                        <input className="form-check-input"
                            id="directMode"
                            type="radio"
                            name="capture-mode"
                            value="DIRECT"
                            checked={mode === "DIRECT"}
                            onChange={res => setMode(res.target.value)}
                        />
                        <label className="form-check-label" htmlFor="directMode">Direct Science</label>
                    </div>
                    <br />
                    <DocTypeState initialDocType={subject} onChange={setSubject} />
                </div>

                <div className="card-footer">
                    <button className="btn btn-primary"
                        onClick={
                            mode === "DIRECT" ?
                                startDirectScience :
                                mode === "AUTO_CAPTURE" ?
                                    startAutoCapture :
                                    startManualCapture
                        }
                    >Push iT!</button>
                </div>
            </div>

            <div className="card">
                <h4 className="card-header">Capture Gallery</h4>
                <Gallery captures={gallery.captures} />
            </div>
        </div>
    );

}

export default App;
