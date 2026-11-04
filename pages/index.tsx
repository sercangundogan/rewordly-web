import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useState } from "react";
import Header from "../components/Header";

// SVG Icons
const SparklesIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#FFAC33"
      d="M34.347 16.893l-8.899-3.294-3.323-10.891a1 1 0 0 0-1.912 0l-3.322 10.891-8.9 3.294a1 1 0 0 0 0 1.876l8.895 3.293 3.324 11.223a1 1 0 0 0 1.918-.001l3.324-11.223 8.896-3.293a.998.998 0 0 0-.001-1.875z"
    />
    <path
      fill="#FFCC4D"
      d="M14.347 27.894l-2.314-.856-.9-3.3a.998.998 0 0 0-1.929-.001l-.9 3.3-2.313.856a1 1 0 0 0 0 1.876l2.301.853.907 3.622a1 1 0 0 0 1.94-.001l.907-3.622 2.301-.853a.997.997 0 0 0 0-1.874zM10.009 6.231l-2.364-.875-.876-2.365a.999.999 0 0 0-1.876 0l-.875 2.365-2.365.875a1 1 0 0 0 0 1.876l2.365.875.875 2.365a1 1 0 0 0 1.876 0l.875-2.365 2.365-.875a1 1 0 0 0 0-1.876z"
    />
  </svg>
);

const HighVoltageIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#ffce31"
      d="M44.5 2l-9 2.5L29.4 2l-9.9 34.4h10.4L20.8 62l22.4-34.4H29.7z"
    />
  </svg>
);

const GlobeIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 1024 1024"
    version="1.1"
  >
    <path
      d="M1023.944003 511.972002c0 282.792535-229.235464 512.027998-511.948003 512.027998C229.235464 1024 0 794.764536 0 511.972002 0 229.243463 229.235464 0.008 511.996 0.008 794.708539 0.008 1023.944003 229.243463 1023.944003 511.972002z"
      fill="#0092D2"
    />
    <path
      d="M1023.944003 512.035998C1023.944003 229.243463 794.708539 0.008 511.996 0.008 229.235464 0.008 0 229.243463 0 512.035998"
      fill="#38AFE0"
    />
    <path
      d="M511.996 1024C229.235464 1024 0 794.764536 0 511.972002 0 229.243463 229.235464 0.008 511.996 0.008"
      fill="#36B3DD"
    />
    <path
      d="M511.964002 1024c-103.13836 0-186.709789-229.235464-186.709789-512.027998 0-282.728538 83.57143-511.964002 186.709789-511.964002 103.090362 0 186.725788 229.235464 186.725788 511.964002 0 282.792535-83.635426 512.027998-186.725788 512.027998z"
      fill="#2AA8D8"
    />
    <path
      d="M0 512.004v0.031998h511.996V0.008a510.340091 510.340091 0 0 0-199.285101 40.245799C128.952948 117.961549 0 299.927598 0 512.004z"
      fill="#3FC6EA"
    />
    <path
      d="M698.68979 511.972002c0-282.728538-83.635426-511.964002-186.725788-511.964002h-0.031998C408.825642 0.039998 325.254213 229.243463 325.254213 511.972002v0.063996h373.435577v-0.063996z"
      fill="#42B8E4"
    />
  </svg>
);

const ShieldIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#646363"
      d="M468.125,128.73C304.284,99.474,234.069,0,234.069,0S163.847,99.474,0.013,128.73c0,64.367-5.858,277.944,234.056,383.27C473.976,406.675,468.125,193.098,468.125,128.73z"
    />
    <path
      fill="#EAEEBE"
      d="M234.069,466.88C63.977,384.073,43.61,240.378,41.255,161.786c95.349-23.792,158.067-69.25,192.814-101.558c34.747,32.308,97.458,77.766,192.807,101.558C424.528,240.378,404.155,384.073,234.069,466.88z"
    />
    <path
      fill="#F0C57B"
      d="M410.284,169.867c-1.813,70.95-19.134,203.716-176.215,279.583c-29.05-14.015-53.306-29.989-73.582-47.191c-27.411-23.173-47.513-48.568-62.293-74.285c-33.346-58.164-39.32-118.025-40.346-158.106c88.156-21.531,145.384-63.78,176.221-92.92c15.328,14.483,37.185,32.21,66.118,49.035c26.16,15.183,58.132,29.637,96.284,40.256C400.981,167.525,405.6,168.725,410.284,169.867z"
    />
    <path
      fill="#716363"
      d="M234.069,76.947c-30.837,29.14-88.066,71.389-176.221,92.92c0.613,23.74,3.007,54.442,11.742,87.595h164.48V76.947z"
    />
    <path
      fill="#F1891A"
      fillOpacity="0.26"
      d="M396.472,166.238c-38.152-10.618-70.124-25.073-96.284-40.256c-28.934-16.825-50.79-34.552-66.118-49.035v180.515h164.506c8.748-33.153,11.103-63.841,11.709-87.595C405.6,168.725,400.981,167.525,396.472,166.238z"
    />
    <path
      fill="#F1891A"
      fillOpacity="0.26"
      d="M69.589,257.462c6.012,22.824,15.011,46.8,28.604,70.512c14.78,25.718,34.882,51.113,62.293,74.285c20.276,17.202,44.532,33.176,73.582,47.191V257.462H69.589z"
    />
    <path
      fill="#716363"
      d="M234.069,449.449c104.49-50.468,147.133-126.108,164.506-191.988H234.069V449.449z"
    />
  </svg>
);

const PencilPaperIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon
      fill="#FBE6B7"
      points="180.006,414.017 171.785,422.16 115.097,478.926 115.019,478.926 113.923,480.023 113.844,479.945 113.375,479.474 113.297,479.474 73.6,439.701 72.895,439.074 72.19,438.29 32.494,398.671 31.867,398.046 97.95,331.961"
    />
    <path
      fill="#FFFFFF"
      d="M511.439,67.631c-0.627,2.739-2.036,5.402-4.15,7.516l-35.938,35.937l-7.673,7.673l-4.15,4.15c-6.264,6.264-16.599,6.264-22.941,0l-23.724-23.724L389.06,75.38c-6.342-6.341-6.342-16.676,0-22.941l4.15-4.15l7.673-7.673l9.552-9.552L436.743,4.68c2.114-2.114,4.776-3.525,7.595-4.15c5.324-1.409,11.275,0,15.425,4.15l23.724,23.803l23.802,23.722C511.439,56.355,512.848,62.305,511.439,67.631z"
    />
    <polygon
      fill="#FEF9E7"
      points="477.145,116.88 404.72,189.306 363.692,148.276 322.664,107.248 395.089,34.823 471.351,111.085"
    />
    <polygon
      fill="#BBBA9C"
      points="486.697,107.248 477.145,116.88 469.472,124.473 463.678,118.757 393.21,48.29 387.416,42.498 404.641,25.271 480.903,101.533"
    />
    <polygon
      fill="#EDA8AA"
      points="417.874,176.072 404.72,189.306 309.901,284.123 180.006,414.017 171.785,422.16 130.835,381.134 89.808,340.105 97.95,331.961 227.845,202.067 322.664,107.248 335.818,94.095 376.846,135.122"
    />
    <path
      fill="#FBE6B7"
      d="M115.019,478.926l-1.096,0.314l-0.548,0.235h-0.078l-72.112,20.907c-0.078-0.157-0.157-0.237-0.157-0.392c-3.132-6.029-7.125-11.745-12.214-16.835c-5.089-5.089-10.805-9.16-16.912-12.215c-0.078-0.076-0.235-0.076-0.313-0.157l20.906-72.112l0.235-0.703l0.314-1.097l0.861,0.862L74.07,437.9l1.488,1.487l38.601,38.6L115.019,478.926z"
    />
    <path
      fill="#6C3734"
      d="M41.654,499.833l-0.626,0.157l-0.078,0.078l-26.543,7.751L0,511.969l4.15-14.407l7.751-26.622l0.235-0.703c6.186,3.131,12.058,7.203,17.226,12.372C34.529,487.775,38.601,493.647,41.654,499.833z"
    />
    <polygon
      fill="#EDA8AA"
      points="309.901,284.123 180.006,414.017 115.097,478.926 113.766,480.258 113.844,479.945 113.923,479.239 114.158,477.987 122.457,431.087 75.557,439.387 73.6,439.701 71.955,440.012 71.877,440.012 72.19,438.29 72.504,436.333 80.803,389.432 33.903,397.732 32.728,397.968 31.945,398.124 31.789,398.124 97.95,331.961 227.845,202.067"
    />
  </svg>
);

const MoneyBagIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    height={size}
    width={size}
    version="1.1"
    id="_x36_"
    viewBox="0 0 512 512"
    xmlSpace="preserve"
  >
    <g>
      <path
        style={{ fill: "#54514E" }}
        d="M363.233,42.356c-0.953,6.324-5.024,13.079-12.473,19.143   c-24.426,19.749-32.569,36.033-34.647,41.144c-0.433,1.126-0.606,1.732-0.606,1.732H196.493c0,0-0.173-0.606-0.606-1.732   c-2.079-5.111-10.221-21.395-34.647-41.144c-0.26-0.173-0.433-0.347-0.606-0.52c-27.545-23.041-5.63-54.136,35.86-42.53   c1.992,0.52,3.811,0.953,5.457,1.213C224.211,22.954,218.408,0,256,0c40.451,0,30.663,26.505,59.507,18.45   c7.969-2.252,15.158-2.858,21.482-2.338C355.091,17.757,365.485,29.277,363.233,42.356z"
      />
      <path
        style={{ fill: "#54514E" }}
        d="M443.095,324.905C443.095,428.24,359.335,512,256,512c-26.851,0-52.404-5.63-75.445-15.938   c-42.616-18.709-76.916-53.01-95.713-95.626c-10.221-23.127-15.938-48.679-15.938-75.531c0-97.445,94.154-171.85,123.084-198.268   c1.732-1.473,3.292-2.945,4.504-4.158h119.013c1.213,1.213,2.772,2.685,4.504,4.158   C348.941,153.055,443.095,227.459,443.095,324.905z"
      />
      <path
        style={{ fill: "#F7D770" }}
        d="M328.932,114.856c0,5.717-3.811,10.394-8.921,11.781c-1.039,0.346-2.165,0.52-3.292,0.52H195.28   c-1.126,0-2.252-0.173-3.292-0.52c-5.11-1.386-8.921-6.063-8.921-11.781c0-6.756,5.457-12.213,12.213-12.213h121.439   C323.475,102.643,328.932,108.1,328.932,114.856z"
      />
      <path
        style={{ fill: "#FFFFFF" }}
        d="M313.486,380.722c-3.202,6.019-7.635,11.045-13.207,15.17c-5.601,4.095-12.314,7.149-20.127,9.171   c-3.41,0.853-6.98,1.448-10.609,1.943v22.715h-27.098v-22.269c-7.723-0.644-15.1-1.844-22.041-3.758   c-10.619-2.905-24.519-14.644-24.519-14.644c-1.19-0.683-1.974-1.904-2.132-3.252c-0.179-1.368,0.287-2.746,1.259-3.708   l13.583-13.583c1.468-1.467,3.728-1.735,5.503-0.664c0,0,10.163,8.834,17.857,10.916c7.704,2.102,15.348,3.163,22.983,3.163   c9.608,0,17.559-1.696,23.865-5.087c6.315-3.441,9.458-8.705,9.458-15.943c0-5.185-1.537-9.3-4.66-12.314   c-3.103-3.004-8.348-4.878-15.764-5.701l-24.331-2.092c-14.406-1.407-25.521-5.423-33.313-12.007   c-7.833-6.613-11.719-16.637-11.719-30.022c0-7.417,1.497-14.02,4.511-19.829c3.015-5.8,7.099-10.708,12.304-14.704   c5.205-4.005,11.273-7.02,18.174-8.992c2.875-0.853,5.909-1.398,8.982-1.893v-19.573h27.098v19.165   c6.335,0.624,12.354,1.636,17.965,3.183c9.498,2.578,19.492,10.4,19.492,10.4c1.259,0.664,2.103,1.884,2.32,3.262   c0.208,1.408-0.248,2.796-1.229,3.817l-12.74,12.929c-1.358,1.379-3.461,1.735-5.196,0.832c0,0-7.545-5.364-14.059-7.059   c-6.514-1.705-13.356-2.578-20.574-2.578c-9.41,0-16.369,1.814-20.861,5.413c-4.511,3.599-6.741,8.319-6.741,14.099   c0,5.215,1.576,9.221,4.798,12.027c3.193,2.796,8.586,4.62,16.221,5.393l21.307,1.835c15.814,1.378,27.781,5.582,35.882,12.581   c8.12,7,12.165,17.232,12.165,30.618C318.295,367.733,316.678,374.713,313.486,380.722z"
      />
    </g>
  </svg>
);

const TargetIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height={size}
    width={size}
    viewBox="0 0 1024 1024"
    version="1.1"
  >
    <path
      d="M482.4 512m-450.4 0a450.4 450.4 0 1 0 900.8 0 450.4 450.4 0 1 0-900.8 0Z"
      fill="#CCBECC"
    />
    <path
      d="M482.4 970.4C229.6 970.4 24 764.8 24 512S229.6 53.6 482.4 53.6s458.4 205.6 458.4 458.4-205.6 458.4-458.4 458.4z m0-900.8C238.4 69.6 40 268 40 512c0 244 198.4 442.4 442.4 442.4s442.4-198.4 442.4-442.4c0-244-198.4-442.4-442.4-442.4z"
      fill="#6A576D"
    />
    <path
      d="M482.4 837.6c-179.2 0-325.6-145.6-325.6-325.6 0-179.2 145.6-325.6 325.6-325.6C661.6 186.4 808 332.8 808 512c0 179.2-146.4 325.6-325.6 325.6z"
      fill="#FFFFFF"
    />
    <path
      d="M482.4 845.6c-184 0-333.6-149.6-333.6-333.6s149.6-333.6 333.6-333.6S816 328 816 512s-149.6 333.6-333.6 333.6z m0-651.2c-175.2 0-317.6 142.4-317.6 317.6s142.4 317.6 317.6 317.6S800 687.2 800 512 657.6 194.4 482.4 194.4z"
      fill="#6A576D"
    />
    <path
      d="M482.4 712c-110.4 0-200-89.6-200-200s89.6-200 200-200 200 89.6 200 200-89.6 200-200 200z"
      fill="#F1ED7B"
    />
    <path
      d="M482.4 720c-114.4 0-208-93.6-208-208s93.6-208 208-208 208 93.6 208 208-92.8 208-208 208z m0-400c-105.6 0-192 86.4-192 192s86.4 192 192 192 192-86.4 192-192-86.4-192-192-192z"
      fill="#6A576D"
    />
    <path
      d="M482.4 587.2c-41.6 0-75.2-33.6-75.2-75.2s33.6-75.2 75.2-75.2 75.2 33.6 75.2 75.2-33.6 75.2-75.2 75.2z"
      fill="#EC7BB0"
    />
    <path
      d="M482.4 595.2c-45.6 0-83.2-37.6-83.2-83.2s37.6-83.2 83.2-83.2S565.6 466.4 565.6 512 528 595.2 482.4 595.2z m0-150.4c-36.8 0-67.2 30.4-67.2 67.2s30.4 67.2 67.2 67.2 67.2-30.4 67.2-67.2-30.4-67.2-67.2-67.2z"
      fill="#6A576D"
    />
    <path
      d="M904.8 884.8l60-22.4-45.6-34.4-37.6 5.6 25.6-14.4-72.8-56-49.6 12-299.2-269.6c-3.2-3.2-6.4-4.8-9.6-1.6-2.4 2.4-1.6 5.6 0 9.6l291.2 280-8.8 50.4 27.2 30.4 8.8-25.6-0.8 34.4 73.6 84.8 18.4-61.6-4.8-4.8 19.2 18.4c2.4 2.4 8.8-0.8 14.4-7.2 5.6-5.6 8-12.8 6.4-14.4l-16-13.6z"
      fill="#0D1014"
    />
    <path
      d="M957.6 243.2L484.8 514.4c-3.2 1.6-7.2 0.8-9.6-2.4-1.6-3.2-0.8-7.2 2.4-9.6l465.6-283.2 14.4 24z"
      fill="#FFFFFF"
    />
    <path
      d="M481.6 523.2c-5.6 0-10.4-3.2-12.8-7.2-4-7.2-1.6-16 5.6-20.8l465.6-283.2c1.6-0.8 4-1.6 6.4-0.8 2.4 0.8 4 1.6 4.8 4l14.4 24c0.8 1.6 1.6 4 0.8 6.4-0.8 2.4-1.6 4-4 4.8L488.8 521.6c-2.4 0.8-4.8 1.6-7.2 1.6z m459.2-292.8L554.4 464.8l392-225.6-5.6-8.8z"
      fill="#6A576D"
    />
    <path
      d="M924 168.8l-43.2 32-4.8 34.4-6.4-26.4-68.8 51.2-2.4 49.6 129.6-79.2z"
      fill="#EC7BB0"
    />
    <path
      d="M798.4 315.2c-1.6 0-3.2 0-4-0.8-2.4-1.6-4-4-4-7.2l2.4-48c0-2.4 1.6-4.8 3.2-5.6l68.8-51.2c2.4-1.6 4.8-1.6 7.2-0.8v-2.4c0-2.4 1.6-4 3.2-5.6l43.2-32c2.4-1.6 5.6-2.4 8-0.8 2.4 1.6 4.8 4 4.8 6.4l4 59.2c0 3.2-1.6 5.6-4 7.2l-129.6 79.2c-0.8 2.4-2.4 2.4-3.2 2.4z m10.4-51.2l-1.6 28.8L920 224l-3.2-40-28.8 20.8-4.8 31.2c-0.8 4-4 6.4-7.2 7.2-4 0-7.2-2.4-8-6.4l-3.2-14.4-56 41.6z"
      fill="#6A576D"
    />
    <path
      d="M867.2 318.4l30.4 9.6 94.4-44-50.4-32-131.2 76 42.4 20 35.2-16z"
      fill="#EC7BB0"
    />
    <path
      d="M852.8 356c-0.8 0-2.4 0-3.2-0.8l-42.4-20.8c-2.4-1.6-4.8-4-4.8-7.2s1.6-5.6 4-7.2l131.2-76c2.4-1.6 5.6-1.6 8 0l50.4 32c2.4 1.6 4 4 4 7.2s-1.6 5.6-4.8 6.4l-94.4 44c-1.6 0.8-4 0.8-5.6 0-0.8 1.6-2.4 3.2-4 4l-34.4 16c-1.6 2.4-2.4 2.4-4 2.4z m-24.8-28.8l25.6 12 18.4-8.8-8.8-6.4c-3.2-2.4-4-6.4-2.4-10.4s5.6-5.6 9.6-4l27.2 8.8 78.4-36-33.6-21.6-114.4 66.4z"
      fill="#6A576D"
    />
  </svg>
);

const RocketIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width={size}
    height={size}
    viewBox="0 0 64 64"
    aria-hidden="true"
    role="img"
    preserveAspectRatio="xMidYMid meet"
  >
    <g fill="#ff9d27">
      <path d="M10.9 48.7c4-4 4.4-5 6.9-2.5s1.5 2.8-2.5 6.9c-3 3-6.8 2.4-6.8 2.4s-.6-3.8 2.4-6.8"></path>

      <path d="M18.5 52.8c1.6-4.2 2.1-4.7-.2-6c-2.3-1.3-2.3-.4-3.8 3.8c-1.2 3.1.2 5.9.2 5.9s2.7-.5 3.8-3.7"></path>
    </g>

    <path
      d="M16.2 48.9c.9-2.3.9-2.8 2.1-2.1c1.3.7 1 1 .1 3.3c-.6 1.7-2.1 2.1-2.1 2.1s-.7-1.5-.1-3.3"
      fill="#fdf516"
    ></path>

    <path
      d="M17.1 45.7c-1.3-2.3-1.8-1.8-6-.2c-3.1 1.2-3.7 3.8-3.7 3.8s2.8 1.4 5.9.2c4.2-1.6 5.1-1.6 3.8-3.8"
      fill="#ff9d27"
    ></path>

    <g fill="#fdf516">
      <path d="M15 47.8c2.3-.9 2.8-.9 2.1-2.1c-.7-1.3-1-1-3.3-.1c-1.7.6-2.1 2.1-2.1 2.1s1.6.7 3.3.1"></path>

      <path d="M13.9 47.6c2.2-2.2 2.4-2.8 3.8-1.4s.8 1.6-1.4 3.8c-1.7 1.7-3.8 1.3-3.8 1.3s-.2-2 1.4-3.7"></path>
    </g>

    <path
      d="M18.5 38C12.3 27.6 2 31.9 2 31.9s14.7-14.7 24.6-4.8L18.5 38z"
      fill="#3baacf"
    ></path>

    <path
      d="M23.3 30.3l3.2-3.2C16.7 17.2 2 31.9 2 31.9s12.9-9.2 21.3-1.6"
      fill="#428bc1"
    ></path>

    <path
      d="M26 45.5C36.4 51.7 32.1 62 32.1 62s14.7-14.7 4.8-24.6L26 45.5z"
      fill="#3baacf"
    ></path>

    <path
      d="M33.7 40.7l3.2-3.2c9.9 9.9-4.8 24.6-4.8 24.6s9.2-13 1.6-21.4"
      fill="#428bc1"
    ></path>

    <path
      d="M48.8 30.9C37.1 42.5 24.2 48.8 19.7 44.3c-4.5-4.5 1.8-17.4 13.4-29.1c13.6-13.6 28.7-13 28.7-13s.5 15.1-13 28.7"
      fill="#c5d0d8"
    ></path>

    <path
      d="M45.8 27.6C34.2 39.2 22.6 46.8 19.9 44.1c-2.7-2.7 4.9-14.3 16.5-25.9C50 4.6 62 2 62 2s-2.6 12-16.2 25.6z"
      fill="#dae3ea"
    ></path>

    <path
      d="M24.3 47.5c-.5.5-1.3.5-1.8 0l-6-6c-.5-.5-.5-1.4 0-1.9l1.8-1.8l7.8 7.8l-1.8 1.9"
      fill="#c94747"
    ></path>

    <path
      d="M22.6 45.7c-.5.5-1.1.7-1.4.4l-3.4-3.4c-.3-.3-.1-.9.4-1.4l1.8-1.8l4.4 4.4l-1.8 1.8"
      fill="#f15744"
    ></path>

    <path
      d="M20.9 48.2c-.3.3-1 .3-1.3 0l-3.9-3.9c-.3-.3-.2-.9.1-1.2l1.2-1.2l5.1 5.1l-1.2 1.2"
      fill="#3e4347"
    ></path>

    <path
      d="M20.1 47.4c-.3.3-.9.4-1.1.2l-2.7-2.7c-.2-.2-.1-.7.3-1l1.2-1.2l3.5 3.5l-1.2 1.2"
      fill="#62727a"
    ></path>

    <path
      d="M61.8 2.2S56.4 2 49.1 4.8l10.1 10.1C62 7.6 61.8 2.2 61.8 2.2"
      fill="#c94747"
    ></path>

    <path
      d="M61.8 2.2s-4.3.9-10.8 4.6l6.2 6.2c3.7-6.5 4.6-10.8 4.6-10.8"
      fill="#f15744"
    ></path>

    <circle cx="43.5" cy="20.5" r="5" fill="#edf4f9"></circle>

    <circle cx="43.5" cy="20.5" r="3.3" fill="#3baacf"></circle>

    <circle cx="33.5" cy="30.5" r="5" fill="#edf4f9"></circle>

    <circle cx="33.5" cy="30.5" r="3.3" fill="#3baacf"></circle>

    <g fill="#ffffff">
      <path d="M48.9 6.9c-.3.3-.9.3-1.2 0c-.3-.3-.3-.9 0-1.2c.3-.3.9-.3 1.2 0c.3.3.3.9 0 1.2"></path>

      <circle cx="50.6" cy="8.6" r=".8"></circle>

      <circle cx="53" cy="11" r=".8"></circle>

      <circle cx="55.3" cy="13.4" r=".8"></circle>

      <circle cx="57.7" cy="15.7" r=".8"></circle>
    </g>
  </svg>
);

const ChromeIcon = ({ size = 24, color = "#0a0a0a" }: { size?: number, color?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color }}
  >
    <path
      d="M11.8195 6.9C14.6795 6.28 17.5795 6.19 20.4495 6.66C18.6795 3.86 15.5595 2 11.9995 2C8.88953 2 6.10953 3.42 4.26953 5.65C4.70953 6.95 5.26953 8.19 5.93953 9.37C6.31953 10.05 7.28953 10.02 7.67953 9.35C8.52953 7.92 10.0595 6.96 11.8195 6.9Z"
      
    />
    <path
      d="M7.72002 14.7214C5.72002 12.5814 4.16002 10.1414 3.09002 7.44141C1.59002 10.4014 1.60002 14.0314 3.43002 17.0814C5.03002 19.7514 7.67002 21.4114 10.53 21.8414C11.42 20.7914 12.2 19.6714 12.87 18.5014C13.26 17.8214 12.73 17.0114 11.95 17.0114C10.28 17.0214 8.67002 16.2014 7.72002 14.7214Z"
      
    />
    <path
      d="M8.57031 11.9982C8.57031 12.6082 8.72031 13.1782 9.03031 13.7182C9.64031 14.7682 10.7703 15.4282 11.9903 15.4282C13.2103 15.4282 14.3503 14.7682 14.9503 13.7182C15.2603 13.1782 15.4203 12.6082 15.4203 11.9982C15.4203 10.1082 13.8803 8.57817 11.9903 8.57817C10.1103 8.56817 8.57031 10.1082 8.57031 11.9982Z"
      
    />
    <path
      d="M21.3402 8.41931C19.9702 8.12931 18.5802 7.96931 17.2002 7.94931C16.4102 7.93931 15.9602 8.79931 16.3502 9.48931C16.7502 10.1993 16.9802 11.0193 16.9802 11.8893C16.9802 12.7293 16.7602 13.5593 16.3502 14.2993C15.4102 17.1793 14.0102 19.7393 12.1602 21.9993C17.6102 21.9093 22.0002 17.4693 22.0002 11.9993C22.0002 10.7393 21.7702 9.52931 21.3402 8.41931Z"
      
    />
  </svg>
);

/** Shown in the FAQ section and in the FAQPage structured data, so the two never drift apart. */
const LANDING_FAQ = [
  {
    q: "What is Rewordly?",
    a: "Rewordly is a free Chrome extension that checks your grammar and spelling as you type and rewrites text with AI, on almost any website. Mistakes are underlined right where you write: hover to see the fix and apply it in one click.",
  },
  {
    q: "How does the live grammar check work?",
    a: "When you write in a text box, comment, post or editor, Rewordly checks each sentence once you finish it (or pause), and underlines clear spelling, grammar and punctuation mistakes. Hover an underline to see the suggestion and why, then apply it, ignore it, or add the word to your dictionary. Fixes go through the site's own editor, so formatting and undo keep working.",
  },
  {
    q: "Which languages does Rewordly support?",
    a: "Rewordly detects the language of every sentence automatically, so you can write in English, Turkish, German, Spanish and many other languages without changing any settings. Suggestions are explained in the language you wrote in.",
  },
  {
    q: "Is Rewordly free?",
    a: "Yes. You can try live checking right away, without an account. Create a free account to keep going with a daily allowance of live checks, plus 10 rewrites and 10 grammar checks a day. Rewordly Pro ($4.99/month or $49/year) removes the daily limits.",
  },
  {
    q: "What websites does Rewordly work on?",
    a: "Rewordly works in the text boxes and editors of most websites in Chrome, including Reddit, X (Twitter), Medium and LinkedIn. It skips password, email and payment fields and code editors. Google Docs isn't supported yet.",
  },
  {
    q: "Does Rewordly store my text?",
    a: "Rewordly only checks the field you're typing in, sentence by sentence, and skips password fields and fields marked as email, phone or payment details. To make checks faster and keep Rewordly free, we keep check results (the flagged words and suggestions, not your full text) and a count of characters checked for usage limits. Text is processed with OpenAI's API. We never sell your text.",
  },
  {
    q: "Can I turn off live checking?",
    a: "Yes. Switch off \"Auto grammar check\" in the Rewordly popup, or disable Rewordly on a specific site from the right-click menu. Selecting text and clicking Rewrite or Check Grammar keeps working either way.",
  },
  {
    q: "How is Rewordly different from Grammarly or QuillBot?",
    a: "Rewordly combines live, as-you-type underlines with one-click AI rewriting in a single lightweight extension. It works in many languages, lets you start without an account, and fixes text in place on the page instead of in a separate app. Pro is $4.99/month.",
  },
  {
    q: "Can I use Rewordly with keyboard shortcuts?",
    a: "Yes. The default shortcuts are Ctrl+Shift+E for rewriting and Ctrl+Shift+L for grammar check. You can customise them in Chrome's extension shortcut settings; there's a direct link in the Rewordly popup.",
  },
];

const Home: NextPage = () => {
  const [pricingPlan, setPricingPlan] = useState<"monthly" | "yearly">("yearly");

  return (
    <>
      <Head>
        <title>
          Rewordly – AI Grammar Checker &amp; Rewriter for Chrome (Free)
        </title>
        <meta
          name="description"
          content="Rewordly underlines grammar and spelling mistakes as you type on any website, in any language, and rewrites text with AI in one click. Free Chrome extension, no sign-up."
        />
        <meta
          name="keywords"
          content="grammar checker as you type, free grammar checker chrome extension, Grammarly alternative, AI grammar checker, multilingual grammar checker, spell checker chrome, AI text rewriter, paraphrase tool chrome, AI writing assistant, rewordly"
        />
        <meta name="author" content="Rewordly" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="application-name" content="Rewordly" />
        <meta name="generator" content="Rewordly" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rewordly.store/" />
        <meta
          property="og:title"
          content="Rewordly – AI Grammar Checker &amp; Rewriter for Chrome (Free)"
        />
        <meta
          property="og:description"
          content="Mistakes underlined as you type, on any website, in any language. Plus one-click AI rewriting. Free Chrome extension, no sign-up."
        />
        <meta property="og:image" content="https://rewordly.store/og-image.png" />
        <meta property="og:site_name" content="Rewordly" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rewordly.store/" />
        <meta
          property="twitter:title"
          content="Rewordly – AI Grammar Checker &amp; Rewriter for Chrome (Free)"
        />
        <meta
          property="twitter:description"
          content="Mistakes underlined as you type, on any website, in any language. Plus one-click AI rewriting. Free Chrome extension, no sign-up."
        />
        <meta property="twitter:image" content="https://rewordly.store/og-image.png" />

        {/* Favicons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Theme Colors */}
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />

        <link rel="canonical" href="https://rewordly.store/" />

        {/* Structured Data: SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Rewordly",
              "operatingSystem": "Chrome",
              "applicationCategory": "BrowserApplication",
              "applicationSubCategory": "Writing Assistant",
              "description": "Rewordly is a free Chrome extension that underlines grammar and spelling mistakes as you type on any website, in any language, and rewrites text with AI in one click. No sign-up or API key required to start.",
              "url": "https://rewordly.store",
              "downloadUrl": "https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp",
              "installUrl": "https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp",
              "softwareVersion": "1.8.0",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "5.0",
                "ratingCount": "6",
                "bestRating": "5",
                "worstRating": "1"
              },
              "featureList": [
                "Live grammar and spelling check as you type",
                "Automatic language detection",
                "One-click fixes that keep formatting and undo",
                "AI-powered text rewriting",
                "Tone adjustment (formal, casual, concise, elaborate)",
                "Shorter and longer text controls",
                "Works on Reddit, X, Medium, LinkedIn and most text boxes",
                "Keyboard shortcuts",
                "Free to start, no sign-up required"
              ],
              "screenshot": "https://rewordly.store/og-image.png",
              "publisher": {
                "@type": "Organization",
                "name": "Rewordly",
                "url": "https://rewordly.store"
              }
            }),
          }}
        />

        {/* Structured Data: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Rewordly",
              "url": "https://rewordly.store",
              "description": "Free Chrome extension that checks grammar as you type and rewrites text with AI.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://rewordly.store/blog?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />

        {/* Structured Data: FAQPage (same questions as the visible FAQ) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": LANDING_FAQ.map((item) => ({
                "@type": "Question",
                "name": item.q,
                "acceptedAnswer": { "@type": "Answer", "text": item.a },
              })),
            }),
          }}
        />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: #171717;
          line-height: 1.6;
          overflow-x: hidden;
          background: #ffffff;
        }

        /* Hero Section */
        .hero {
          min-height: 100vh;
          padding: 140px 40px 60px;
          background: linear-gradient(
            180deg,
            #fafafa 0%,
            #f5f5f5 50%,
            #ffffff 100%
          );
          position: relative;
          overflow: hidden;
        }

        .hero-container {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 40px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .hero-content {
          max-width: 560px;
          position: relative;
        }

        .hero-content::before {
          content: "";
          position: absolute;
          top: -50px;
          left: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(
            circle,
            rgba(0, 0, 0, 0.04) 0%,
            transparent 70%
          );
          border-radius: 50%;
          z-index: -1;
          filter: blur(50px);
        }

        .hero-content::after {
          content: "";
          position: absolute;
          bottom: -30px;
          right: -50px;
          width: 250px;
          height: 250px;
          background: radial-gradient(
            circle,
            rgba(0, 0, 0, 0.03) 0%,
            transparent 70%
          );
          border-radius: 50%;
          z-index: -1;
          filter: blur(40px);
        }

        /* Content decorative shapes */
        .content-decoration {
          position: absolute;
          border-radius: 50%;
          z-index: -1;
          pointer-events: none;
        }

        .content-decoration-1 {
          top: 20%;
          left: -30px;
          width: 60px;
          height: 60px;
          background: rgba(0, 0, 0, 0.06);
          filter: blur(15px);
        }

        .content-decoration-2 {
          bottom: 10%;
          right: 10%;
          width: 40px;
          height: 40px;
          background: rgba(0, 0, 0, 0.05);
          filter: blur(12px);
        }

        .hero-stats {
          display: flex;
          gap: 40px;
        }

        .stat-item {
          text-align: left;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #0a0a0a;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #737373;
          font-weight: 500;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e5e5;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #525252;
          margin-bottom: 24px;
        }

        .hero-badge-dot {
          width: 8px;
          height: 8px;
          background: #0a0a0a;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .hero h1 {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 24px;
          color: #0a0a0a;
        }

        .hero h1 span {
          color: #0a0a0a;
          text-decoration: underline;
          text-underline-offset: 0.2em;
        }

        .hero-description {
          font-size: 1.15rem;
          color: #525252;
          margin-bottom: 32px;
          line-height: 1.7;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          background: #0a0a0a;
          color: #ffffff;
          border-radius: 50px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .btn-primary:hover {
          transform: translateY(-3px);
          background: #262626;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          background: #ffffff;
          color: #525252;
          border: 2px solid #e5e5e5;
          border-radius: 50px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s;
        }

        .btn-secondary:hover {
          border-color: #0a0a0a;
          color: #0a0a0a;
        }

        /* Hero Visual */
        .hero-visual {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .hero-visual::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(
            circle,
            rgba(0, 0, 0, 0.06) 0%,
            transparent 70%
          );
          border-radius: 50%;
          z-index: 0;
          filter: blur(40px);
        }

        .hero-visual::after {
          content: "";
          position: absolute;
          top: 20%;
          right: 10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(
            circle,
            rgba(0, 0, 0, 0.04) 0%,
            transparent 70%
          );
          border-radius: 50%;
          z-index: 0;
          filter: blur(30px);
        }

        .hero-image-container {
          position: relative;
          z-index: 1;
        }

        .hero-image-container::before {
          content: "";
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 40px;
          background: radial-gradient(
            ellipse,
            rgba(0, 0, 0, 0.05) 0%,
            transparent 70%
          );
          filter: blur(15px);
          z-index: -1;
        }

        .hero-image-container img {
          width: 100%;
          max-width: 700px;
          height: auto;
          display: block;
          position: relative;
          z-index: 1;
        }

        /* CLS Prevention - Reserve space for images */
        .hero-image-container {
          aspect-ratio: 700 / 500;
          max-width: 700px;
        }

        /* Decorative shapes */
        .hero-decoration {
          position: absolute;
          border-radius: 50%;
          z-index: 0;
        }

        .hero-decoration-1 {
          top: 10%;
          right: 5%;
          width: 80px;
          height: 80px;
          background: rgba(0, 0, 0, 0.06);
          filter: blur(20px);
        }

        .hero-decoration-2 {
          bottom: 20%;
          left: 0%;
          width: 120px;
          height: 120px;
          background: rgba(0, 0, 0, 0.05);
          filter: blur(25px);
        }

        .hero-decoration-3 {
          top: 60%;
          right: 0%;
          width: 60px;
          height: 60px;
          background: rgba(0, 0, 0, 0.05);
          filter: blur(15px);
        }

        /* Floating Cards */
        .floating-card {
          position: absolute;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e5e5e5;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.08);
          z-index: 10;
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Stats Card - Top Right */
        .floating-stats-card {
          top: 0%;
          right: -5%;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation-delay: 0s;
        }

        .floating-stats-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 1.2rem;
          filter: grayscale(1);
        }

        .floating-stats-content {
          display: flex;
          flex-direction: column;
        }

        .floating-stats-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0a0a0a;
          line-height: 1.2;
        }

        .floating-stats-label {
          font-size: 0.75rem;
          color: #737373;
          font-weight: 500;
        }

        /* Testimonial Card - Bottom Left */
        .floating-testimonial-card {
          bottom: 15%;
          left: 0%;
          padding: 16px;
          max-width: 220px;
          animation-delay: 1s;
        }

        .floating-testimonial-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .floating-testimonial-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 600;
          font-size: 0.8rem;
          overflow: hidden;
        }

        .floating-testimonial-avatar img,
        .floating-testimonial-avatar span img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .floating-testimonial-info {
          display: flex;
          flex-direction: column;
        }

        .floating-testimonial-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0a0a0a;
          line-height: 1.2;
        }

        .floating-testimonial-stars {
          color: #525252;
          font-size: 0.7rem;
        }

        .floating-testimonial-text {
          font-size: 0.75rem;
          color: #737373;
          line-height: 1.5;
        }

        /* Users Avatars Card - Top Left */
        .floating-users-card {
          top: 25%;
          left: -5%;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation-delay: 0.5s;
        }

        .floating-users-avatars {
          display: flex;
        }

        .floating-users-avatars .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          margin-left: -10px;
          background: #262626;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 600;
          overflow: hidden;
        }

        .floating-users-avatars .avatar:first-child {
          margin-left: 0;
        }

        .floating-users-avatars .avatar img,
        .floating-users-avatars .avatar span img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .floating-users-text {
          display: flex;
          flex-direction: column;
        }

        .floating-users-count {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0a0a0a;
          line-height: 1.2;
        }

        .floating-users-label {
          font-size: 0.7rem;
          color: #737373;
        }

        /* Rating Card - Bottom Right */
        .floating-rating-card {
          bottom: 30%;
          right: -5%;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation-delay: 1.5s;
        }

        .floating-rating-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 1.1rem;
        }

        .floating-rating-content {
          display: flex;
          flex-direction: column;
        }

        .floating-rating-value {
          font-size: 1rem;
          font-weight: 700;
          color: #0a0a0a;
          line-height: 1.2;
        }

        .floating-rating-label {
          font-size: 0.7rem;
          color: #737373;
        }

        .floating-badge {
          position: absolute;
          padding: 12px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .floating-badge-1 {
          top: -20px;
          right: -20px;
          background: #0a0a0a;
          color: #ffffff;
        }

        .floating-badge-2 {
          bottom: 40px;
          left: -30px;
          background: #ffffff;
          color: #0a0a0a;
          border: 1px solid #e5e5e5;
        }

        .floating-badge-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }

        .floating-badge-1 .floating-badge-icon {
          background: rgba(255, 255, 255, 0.2);
        }

        .floating-badge-2 .floating-badge-icon {
          background: #0a0a0a;
          color: #ffffff;
        }

        /* Trusted Section */
        .trusted-section {
          padding: 60px 40px;
          background: #ffffff;
          border-top: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
        }

        .trusted-container {
          max-width: 1000px;
          margin: 0 auto;
          text-align: center;
        }

        .trusted-title {
          font-size: 0.9rem;
          color: #737373;
          font-weight: 500;
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .trusted-logos {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
          flex-wrap: wrap;
          opacity: 0.7;
        }

        .trusted-logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: #525252;
        }

        /* Features Section */
        .features-section {
          padding: 100px 40px;
          background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
        }

        .section-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 60px;
        }

        .section-label {
          display: inline-block;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e5e5;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #525252;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 800;
          color: #0a0a0a;
          margin-bottom: 16px;
        }

        .section-subtitle {
          font-size: 1.1rem;
          color: #525252;
          line-height: 1.7;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .feature-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 32px;
          border: 1px solid #e5e5e5;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .feature-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: #0a0a0a;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
          border-color: #d4d4d4;
        }

        .feature-card:hover::before {
          opacity: 1;
        }

        .feature-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          font-size: 1.5rem;
          filter: grayscale(1);
        }

        .feature-icon-1 {
          background: #f5f5f5;
          color: #525252;
        }
        .feature-icon-2 {
          background: #e5e5e5;
          color: #525252;
        }
        .feature-icon-3 {
          background: #f5f5f5;
          color: #525252;
        }
        .feature-icon-4 {
          background: #e5e5e5;
          color: #525252;
        }
        .feature-icon-5 {
          background: #f5f5f5;
          color: #525252;
        }
        .feature-icon-6 {
          background: #e5e5e5;
          color: #525252;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0a0a0a;
          margin-bottom: 12px;
        }

        .feature-card p {
          font-size: 0.95rem;
          color: #525252;
          line-height: 1.7;
        }

        /* Demo Section */
        .demo-section {
          padding: 100px 40px;
          background: #ffffff;
        }

        .demo-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .how-steps {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .how-step {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          padding: 24px 28px;
          background: #fafafa;
          border-radius: 20px;
          border: 1px solid #e5e5e5;
          transition: all 0.3s;
        }

        .how-step:hover {
          background: #ffffff;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
        }

        .how-step-number {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #0a0a0a;
          color: #ffffff;
          font-size: 1.15rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .how-step-text h4 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0a0a0a;
          margin-bottom: 6px;
        }

        .how-step-text p {
          font-size: 0.95rem;
          color: #525252;
          line-height: 1.65;
        }

        .how-step-text strong {
          color: #0a0a0a;
          font-weight: 600;
        }

        /* Benefits Section */
        .benefits-section {
          padding: 100px 40px;
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .benefits-image {
          position: relative;
        }

        .benefits-image-wrapper {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          max-width: 560px;
          margin: 0 auto;
        }

        .benefits-image-wrapper img,
        .benefits-image-wrapper video {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
          object-position: center;
          max-width: 560px;
        }

        .benefits-content h2 {
          font-size: clamp(1.75rem, 3vw, 2.25rem);
          font-weight: 800;
          color: #0a0a0a;
          margin-bottom: 32px;
        }

        .benefits-content h2 span {
          color: #0a0a0a;
          text-decoration: underline;
          text-underline-offset: 0.2em;
        }

        .benefit-item {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .benefit-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          font-size: 1.25rem;
          color: #525252;
          filter: grayscale(1);
        }

        .benefit-text h4 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0a0a0a;
          margin-bottom: 4px;
        }

        .benefit-text p {
          font-size: 0.9rem;
          color: #525252;
          line-height: 1.6;
        }

        /* Testimonials */
        .testimonials-section {
          padding: 100px 40px;
          background: #ffffff;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .testimonial-card {
          background: #fafafa;
          border-radius: 24px;
          padding: 32px;
          border: 1px solid #e5e5e5;
          transition: all 0.3s;
        }

        .testimonial-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.06);
        }

        .testimonial-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .testimonial-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 700;
          font-size: 1rem;
          overflow: hidden;
        }

        .testimonial-avatar img,
        .testimonial-avatar span img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .testimonial-info h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #0a0a0a;
        }

        .testimonial-rating {
          color: #525252;
          font-size: 0.85rem;
        }

        .testimonial-text {
          font-size: 0.95rem;
          color: #525252;
          line-height: 1.7;
        }

        /* FAQ Section */
        .faq-section {
          padding: 100px 40px;
          background: #fafafa;
        }

        .faq-list {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid #e5e5e5;
          border-radius: 20px;
          overflow: hidden;
        }

        .faq-item {
          border-bottom: 1px solid #e5e5e5;
          background: #ffffff;
        }

        .faq-item:last-child {
          border-bottom: none;
        }

        .faq-question {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
          cursor: pointer;
          transition: background 0.2s;
          gap: 16px;
        }

        .faq-question:hover {
          background: #fafafa;
        }

        .faq-question h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #0a0a0a;
          margin: 0;
          line-height: 1.5;
          flex: 1;
        }

        .faq-toggle {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #f5f5f5;
          border: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.1rem;
          color: #525252;
          font-weight: 300;
          line-height: 1;
          transition: background 0.2s;
        }

        .faq-item.open .faq-toggle {
          background: #0a0a0a;
          color: #ffffff;
          border-color: #0a0a0a;
        }

        .faq-answer {
          display: none;
          padding: 0 28px 24px;
        }

        .faq-item.open .faq-answer {
          display: block;
        }

        .faq-answer p {
          font-size: 0.95rem;
          color: #525252;
          line-height: 1.75;
          margin: 0;
        }

        /* Pricing Section */
        .pricing-section {
          padding: 100px 40px;
          background: #ffffff;
        }

        .pricing-toggle {
          display: inline-flex;
          padding: 4px;
          background: #f5f5f5;
          border: 1px solid #e5e5e5;
          border-radius: 50px;
          margin-bottom: 48px;
        }

        .pricing-toggle button {
          padding: 10px 24px;
          border: none;
          border-radius: 50px;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 600;
          color: #737373;
          background: transparent;
          cursor: pointer;
          transition: all 0.25s;
        }

        .pricing-toggle button.active {
          background: #0a0a0a;
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        .pricing-toggle .save-pill {
          margin-left: 6px;
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .pricing-toggle button:not(.active) .save-pill {
          background: #e5e5e5;
          color: #525252;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 820px;
          margin: 0 auto;
          align-items: stretch;
        }

        .pricing-card {
          background: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 24px;
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s;
        }

        .pricing-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
        }

        .pricing-card.featured {
          background: #0a0a0a;
          border-color: #0a0a0a;
          position: relative;
          overflow: hidden;
        }

        .pricing-card.featured::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.06)"/></svg>');
          pointer-events: none;
        }

        .pricing-plan-name {
          font-size: 1rem;
          font-weight: 700;
          color: #0a0a0a;
          margin-bottom: 4px;
        }

        .pricing-card.featured .pricing-plan-name {
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pricing-best-badge {
          padding: 3px 10px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 50px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .pricing-plan-desc {
          font-size: 0.875rem;
          color: #737373;
          margin-bottom: 24px;
        }

        .pricing-card.featured .pricing-plan-desc {
          color: rgba(255, 255, 255, 0.65);
        }

        .pricing-amount {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 28px;
        }

        .pricing-price {
          font-size: 3rem;
          font-weight: 800;
          color: #0a0a0a;
          line-height: 1;
        }

        .pricing-card.featured .pricing-price {
          color: #ffffff;
        }

        .pricing-period {
          font-size: 0.95rem;
          color: #737373;
          font-weight: 500;
        }

        .pricing-card.featured .pricing-period {
          color: rgba(255, 255, 255, 0.6);
        }

        .pricing-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 32px;
          flex: 1;
        }

        .pricing-features li {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.925rem;
          color: #525252;
        }

        .pricing-card.featured .pricing-features li {
          color: rgba(255, 255, 255, 0.85);
        }

        .pricing-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f5f5f5;
          border: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 0.7rem;
          color: #0a0a0a;
          font-weight: 700;
        }

        .pricing-card.featured .pricing-check {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .pricing-cta {
          display: block;
          width: 100%;
          padding: 15px 24px;
          border-radius: 50px;
          text-align: center;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s;
          border: 2px solid #e5e5e5;
          background: #ffffff;
          color: #0a0a0a;
        }

        .pricing-cta:hover {
          border-color: #0a0a0a;
          transform: translateY(-2px);
        }

        .pricing-card.featured .pricing-cta {
          background: #ffffff;
          border-color: #ffffff;
          color: #0a0a0a;
          box-shadow: 0 8px 30px rgba(255, 255, 255, 0.15);
        }

        .pricing-card.featured .pricing-cta:hover {
          background: #f5f5f5;
          transform: translateY(-2px) scale(1.01);
        }

        .pricing-footnote {
          text-align: center;
          font-size: 0.8rem;
          color: #a3a3a3;
          margin-top: 28px;
        }

        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }
        }

        /* CTA Section */
        .cta-section {
          padding: 100px 40px;
          background: #0a0a0a;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-section::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.06)"/></svg>');
        }

        .cta-container {
          max-width: 700px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .cta-section h2 {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 16px;
        }

        .cta-section p {
          font-size: 1.15rem;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 32px;
          line-height: 1.7;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 18px 40px;
          background: #ffffff;
          color: #0a0a0a;
          border-radius: 50px;
          font-weight: 700;
          font-size: 1.1rem;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .cta-btn:hover {
          transform: translateY(-3px) scale(1.02);
          background: #f5f5f5;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.3);
        }

        /* Footer */
        .footer {
          background: #0a0a0a;
          color: #ffffff;
          padding: 60px 40px 40px;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
        }

        .footer-logo {
          font-size: 1.5rem;
          font-weight: 800;
          color: #ffffff;
        }

        .footer-links {
          display: flex;
          gap: 32px;
        }

        .footer-link {
          color: #a3a3a3;
          text-decoration: none;
          font-size: 0.95rem;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: #ffffff;
        }

        .footer-copyright {
          font-size: 0.9rem;
          color: #a3a3a3;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .hero-content {
            max-width: 100%;
          }

          .hero-buttons {
            justify-content: center;
          }

          .hero-stats {
            justify-content: center;
          }

          .stat-item {
            text-align: center;
          }

          .hero-visual {
            order: -1;
          }

          .hero-image-container img {
            max-width: 500px;
          }

          .floating-card {
            display: none;
          }

          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .benefits-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .testimonials-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .hero {
            min-height: 100vh;
            padding: 100px 20px 40px;
            display: flex;
            align-items: center;
          }

          .hero-container {
            width: 100%;
            align-content: center;
          }

          .hero-visual {
            display: none;
          }

          .hero-stats {
            flex-direction: column;
            gap: 16px;
          }

          .hero-image-container img {
            max-width: 100%;
          }

          .features-grid,
          .testimonials-grid {
            grid-template-columns: 1fr;
          }

          .trusted-logos {
            gap: 24px;
          }

          .benefits-image {
            display: none;
          }

          .footer-container {
            flex-direction: column;
            text-align: center;
          }

          .footer-links {
            flex-wrap: wrap;
            justify-content: center;
          }

          .cta-btn svg {
            display: none;
          }
        }
      `}</style>

      <main>
        <Header showAuthSlot />

        {/* Hero Section */}
        <section className="hero">
          <div className="hero-container">
            <div className="hero-content">
              {/* Content decorative shapes */}
              <div className="content-decoration content-decoration-1"></div>
              <div className="content-decoration content-decoration-2"></div>
              
              <div className="hero-badge">
                <span className="hero-badge-dot"></span>
                New: checks your writing as you type
              </div>
              <h1>
                Fix mistakes <span>as you type</span>, on every website
              </h1>
              <p className="hero-description">
                Rewordly underlines grammar and spelling mistakes while you
                write, in emails, comments, posts and docs, in any language.
                Hover to fix in one click, or rewrite any text with AI. Free to
                start, no sign-up needed.
              </p>
              <div className="hero-buttons">
                <a
                  href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <ChromeIcon size={20} color="#fff" />
                  Add to Chrome - It's Free
                </a>
                <a href="#demo" className="btn-secondary">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                  See how it works
                </a>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-value">Free</div>
                  <div className="stat-label">To Start, No Sign-up</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">5.0★</div>
                  <div className="stat-label">Chrome Store Rating</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">120+</div>
                  <div className="stat-label">Happy Users</div>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              {/* Decorative background shapes */}
              <div className="hero-decoration hero-decoration-1"></div>
              <div className="hero-decoration hero-decoration-2"></div>
              <div className="hero-decoration hero-decoration-3"></div>

              {/* Floating Stats Card - Top Right */}
              <div className="floating-card floating-stats-card">
                <div className="floating-stats-icon">
                  <SparklesIcon size={22} />
                </div>
                <div className="floating-stats-content">
                  <span className="floating-stats-value">Live</span>
                  <span className="floating-stats-label">Checks As You Type</span>
                </div>
              </div>

              {/* Floating Users Card - Top Left */}
              <div className="floating-card floating-users-card">
                <div className="floating-users-avatars">
                  <div className="avatar">
                    <Image src="/customers/customer-himanshu-raikwar.png" alt="User" width={32} height={32} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="avatar">
                    <Image src="/customers/customer-aysu-perin.jpg" alt="User" width={32} height={32} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="avatar">KD</div>
                  <div className="avatar">+5</div>
                </div>
                <div className="floating-users-text">
                  <span className="floating-users-count">120+ Users</span>
                  <span className="floating-users-label">Happy Writers</span>
                </div>
              </div>

              {/* Floating Testimonial Card - Bottom Left */}
              <div className="floating-card floating-testimonial-card">
                <div className="floating-testimonial-header">
                  <div className="floating-testimonial-avatar">
                    <Image src="/customers/customer-himanshu-raikwar.png" alt="Himanshu" width={36} height={36} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = 'HR'; }} />
                  </div>
                  <div className="floating-testimonial-info">
                    <span className="floating-testimonial-name">Himanshu R.</span>
                    <span className="floating-testimonial-stars">★★★★★</span>
                  </div>
                </div>
                <p className="floating-testimonial-text">
                  "Saves me 1+ hour every day by rewriting sentences!"
                </p>
              </div>

              {/* Floating Rating Card - Bottom Right */}
              <div className="floating-card floating-rating-card">
                <div className="floating-rating-icon">✓</div>
                <div className="floating-rating-content">
                  <span className="floating-rating-value">5.0 ★ Rating</span>
                  <span className="floating-rating-label">Chrome Store</span>
                </div>
              </div>
              
              <div className="hero-image-container">
                <Image
                  src="/hero-image-2.png"
                  alt="Rewordly - AI-powered text enhancement"
                  width={700}
                  height={500}
                  priority
                  quality={80}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 700px"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trusted Section */}
        <section className="trusted-section">
          <div className="trusted-container">
            <div className="trusted-title">
              Works seamlessly on all your favorite platforms
            </div>
            <div className="trusted-logos">
              <span className="trusted-logo">Reddit</span>
              <span className="trusted-logo">Gmail</span>
              <span className="trusted-logo">Twitter</span>
              <span className="trusted-logo">Medium</span>
              {/* <span className="trusted-logo">Notion</span> */}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section" id="features">
          <div className="section-container">
            <div className="section-header">
              <span className="section-label">Features</span>
              <h2 className="section-title">
                Everything you need to write better
              </h2>
              <p className="section-subtitle">
                Powerful AI tools that help you communicate more effectively,
                everywhere you write online.
              </p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper feature-icon-1">
                  <SparklesIcon size={28} />
                </div>
                <h3>AI-Powered Rewriting</h3>
                <p>
                  Transform your text with advanced AI. Improve clarity, tone,
                  and readability with a single click.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper feature-icon-2">✓</div>
                <h3>Live Grammar Check</h3>
                <p>
                  Mistakes are underlined as you type, like a second pair of
                  eyes. Hover to see what&apos;s wrong and fix it in one click.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper feature-icon-3">
                  <PencilPaperIcon size={32} />
                </div>
                <h3>Any Language</h3>
                <p>
                  Write in English, Turkish, German, Spanish and more. Rewordly
                  detects the language of every sentence automatically.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper feature-icon-4">
                  <GlobeIcon size={24} />
                </div>
                <h3>Works Everywhere</h3>
                <p>
                  Reddit, X, Medium, LinkedIn and almost any text box or editor.
                  Fixes keep your formatting and undo history.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper feature-icon-5">
                  <ShieldIcon size={32} />
                </div>
                <h3>Private by Design</h3>
                <p>
                  Only the field you&apos;re typing in is checked. Password and
                  payment fields are skipped, and we never sell your text.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper feature-icon-6">
                  <MoneyBagIcon size={32} />
                </div>
                <h3>Free to Start</h3>
                <p>
                  Try live checking without an account, then keep going free
                  with daily limits. Rewordly Pro removes them from $4.99/month.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section className="demo-section" id="demo">
          <div className="demo-container">
            <div className="section-header">
              <span className="section-label">How it works</span>
              <h2 className="section-title">How Rewordly Works</h2>
              <p className="section-subtitle">
                Mistakes are underlined while you type. Rewriting is one click
                away.
              </p>
            </div>
            <div className="how-steps">
              <div className="how-step">
                <div className="how-step-number">1</div>
                <div className="how-step-text">
                  <h4>Write anywhere</h4>
                  <p>
                    Type in any text box, comment, post or editor. Rewordly checks each sentence once you finish it.
                  </p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step-number">2</div>
                <div className="how-step-text">
                  <h4>See mistakes underlined</h4>
                  <p>
                    Clear spelling, grammar and punctuation mistakes get a red underline right where you wrote them, in any language.
                  </p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step-number">3</div>
                <div className="how-step-text">
                  <h4>Hover and fix</h4>
                  <p>
                    Hover an underline to see the suggestion and why. Apply it in one click, ignore it, or add the word to your dictionary. Undo works as usual.
                  </p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step-number">4</div>
                <div className="how-step-text">
                  <h4>Rewrite with AI</h4>
                  <p>
                    Select any text and click <strong>Rewrite</strong> to make it clearer, <strong>Shorter</strong> or <strong>Longer</strong>, or change its tone: formal, casual, concise or elaborate. <strong>Apply</strong> drops it back into the field.
                  </p>
                </div>
              </div>
              <div className="how-step">
                <div className="how-step-number">5</div>
                <div className="how-step-text">
                  <h4>Stay in control</h4>
                  <p>
                    <strong>Ctrl+Shift+E</strong> rewrites and <strong>Ctrl+Shift+L</strong> checks the selection. Switch live checking off in the popup, or per site from the right-click menu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="benefits-section">
          <div className="section-container">
            <div className="benefits-grid">
              <div className="benefits-image">
                <div className="benefits-image-wrapper">
                  <Image
                    src="/why-choose-image-2.png"
                    alt="Why choose Rewordly - AI text enhancement"
                    width={560}
                    height={400}
                    loading="lazy"
                    quality={80}
                    sizes="(max-width: 768px) 100vw, 560px"
                    style={{ width: '100%', height: 'auto', maxWidth: '560px' }}
                  />
                </div>
              </div>
              <div className="benefits-content">
                <h2>
                  Why choose <span>Rewordly</span>?
                </h2>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <HighVoltageIcon size={24} />
                  </div>
                  <div className="benefit-text">
                    <h4>Instant Results</h4>
                    <p>
                      Get improvements in seconds, not minutes. Fast and
                      efficient.
                    </p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <TargetIcon size={24} />
                  </div>
                  <div className="benefit-text">
                    <h4>Quiet Until It Matters</h4>
                    <p>
                      No pop-ups or nagging: only clear mistakes are flagged,
                      and nothing changes until you click.
                    </p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <RocketIcon size={24} />
                  </div>
                  <div className="benefit-text">
                    <h4>No Setup Required</h4>
                    <p>
                      Install and start using immediately. No configuration
                      needed.
                    </p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <MoneyBagIcon size={24} />
                  </div>
                  <div className="benefit-text">
                    <h4>Save Money</h4>
                    <p>
                      A free alternative to expensive writing tools, with an
                      affordable Pro plan when you need more.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="testimonials-section" id="testimonials">
          <div className="section-container">
            <div className="section-header">
              <span className="section-label">Testimonials</span>
              <h2 className="section-title">Loved by users worldwide</h2>
              <p className="section-subtitle">
                See what our users are saying about Rewordly.
              </p>
            </div>
            <div className="testimonials-grid">
              <div className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-avatar">
                    <Image
                      src="/customers/customer-himanshu-raikwar.png"
                      alt="Himanshu Raikwar"
                      width={56}
                      height={56}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) parent.textContent = "HR";
                      }}
                    />
                  </div>
                  <div className="testimonial-info">
                    <h4>Himanshu Raikwar</h4>
                    <div className="testimonial-rating">★★★★★</div>
                  </div>
                </div>
                <p className="testimonial-text">
                  "Every day, he saves me more than 1 hour by helping me rewrite
                  sentences. Fun fact: This review was rewritten by Rewordly."
                </p>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-avatar">
                    <Image
                      src="/customers/customer-aysu-perin.jpg"
                      alt="Aysu Perin"
                      width={56}
                      height={56}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) parent.textContent = "AP";
                      }}
                    />
                  </div>
                  <div className="testimonial-info">
                    <h4>Aysu Perin</h4>
                    <div className="testimonial-rating">★★★★★</div>
                  </div>
                </div>
                <p className="testimonial-text">
                  "Extremely simple yet incredibly useful plugin. The interface
                  is clean and very user-friendly."
                </p>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-avatar">KD</div>
                  <div className="testimonial-info">
                    <h4>Kristian Diana</h4>
                    <div className="testimonial-rating">★★★★★</div>
                  </div>
                </div>
                <p className="testimonial-text">
                  "Extremely convenient for improving writing on the fly. Works
                  quickly and effectively!"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing-section" id="pricing">
          <div className="section-container" style={{ textAlign: "center" }}>
            <div className="section-header">
              <span className="section-label">Pricing</span>
              <h2 className="section-title">Simple, honest pricing</h2>
              <p className="section-subtitle">
                Start free, upgrade when you need unlimited. Cancel anytime.
              </p>
            </div>

            <div className="pricing-toggle" role="tablist" aria-label="Billing period">
              <button
                type="button"
                role="tab"
                aria-selected={pricingPlan === "monthly"}
                className={pricingPlan === "monthly" ? "active" : ""}
                onClick={() => setPricingPlan("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pricingPlan === "yearly"}
                className={pricingPlan === "yearly" ? "active" : ""}
                onClick={() => setPricingPlan("yearly")}
              >
                Yearly
                <span className="save-pill">2 months free</span>
              </button>
            </div>

            <div className="pricing-grid">
              <div className="pricing-card">
                <div className="pricing-plan-name">Free</div>
                <p className="pricing-plan-desc">
                  Everything you need to try Rewordly, forever.
                </p>
                <div className="pricing-amount">
                  <span className="pricing-price">$0</span>
                  <span className="pricing-period">/forever</span>
                </div>
                <ul className="pricing-features">
                  <li>
                    <span className="pricing-check">✓</span>Live grammar check as you type (daily allowance)
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>10 rewrites per day
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>10 grammar checks per day
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>All writing tones
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>Works on every website
                  </li>
                </ul>
                <a
                  href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pricing-cta"
                >
                  Add to Chrome — Free
                </a>
              </div>

              <div className="pricing-card featured">
                <div className="pricing-plan-name">
                  Pro
                  <span className="pricing-best-badge">
                    {pricingPlan === "yearly" ? "Best value" : "Most popular"}
                  </span>
                </div>
                <p className="pricing-plan-desc">
                  Unlimited writing power for people who write all day.
                </p>
                <div className="pricing-amount">
                  <span className="pricing-price">
                    {pricingPlan === "yearly" ? "$49" : "$4.99"}
                  </span>
                  <span className="pricing-period">
                    {pricingPlan === "yearly" ? "/year" : "/month"}
                  </span>
                </div>
                <ul className="pricing-features">
                  <li>
                    <span className="pricing-check">✓</span>Unlimited live grammar checks
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>Unlimited rewrites every day
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>Unlimited grammar checks
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>Up to 3 alternatives per rewrite
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>All writing tones included
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>Priority support
                  </li>
                  <li>
                    <span className="pricing-check">✓</span>Cancel anytime
                  </li>
                </ul>
                <a href="/dashboard" className="pricing-cta">
                  Upgrade to Pro
                </a>
              </div>
            </div>

            <p className="pricing-footnote">
              Secure checkout by Dodo Payments. Prices in USD. Fair use applies to unlimited plans.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section" id="faq">
          <div className="section-container">
            <div className="section-header">
              <span className="section-label">FAQ</span>
              <h2 className="section-title">Frequently asked questions</h2>
              <p className="section-subtitle">
                Everything you need to know about Rewordly.
              </p>
            </div>
            <div className="faq-list">
              {LANDING_FAQ.map((item, i) => (
                <div key={i} className="faq-item" onClick={(e) => {
                  const el = e.currentTarget;
                  el.classList.toggle("open");
                }}>
                  <div className="faq-question">
                    <h3>{item.q}</h3>
                    <span className="faq-toggle">+</span>
                  </div>
                  <div className="faq-answer">
                    <p>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-container">
            <h2>Start writing better today</h2>
            <p>
              Install Rewordly and let it catch the mistakes you&apos;d rather
              not send, on every site you write.
            </p>
            <a
              href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn"
            >
             <ChromeIcon size={24} color="#0a0a0a" />
              Add to Chrome - It's Free
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-container">
            <div className="footer-logo">Rewordly</div>
            <div className="footer-links">
              <a href="/blog" className="footer-link">
                Blog
              </a>
              <a href="/privacy" className="footer-link">
                Privacy Policy
              </a>
              <a href="/terms" className="footer-link">
                Terms of Service
              </a>
              <a href="/cookies" className="footer-link">
                Cookie Policy
              </a>
              <a href="/legal" className="footer-link">
                Legal Notice
              </a>
              <a
                href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                Chrome Web Store
              </a>
              <a
                href="mailto:sercangundogan35@gmail.com"
                className="footer-link"
              >
                Contact
              </a>
            </div>
            <div className="footer-copyright">
              © 2026 Rewordly. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </>
  );
};

export default Home;
