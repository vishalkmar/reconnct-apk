// Status icons for the Payment Details screen — completed/failed are the
// exact assets from the Figma handoff; pending reuses the same "circle +
// white glyph" visual language in the app's existing brand amber so all
// three read as one family.
export const PAYMENT_CHECK_SVG = `
<svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_728_1979)">
<path d="M30 0C13.5 0 0 13.5 0 30C0 46.5 13.5 60 30 60C46.5 60 60 46.5 60 30C60 13.5 46.5 0 30 0ZM42.9 22.8L29.1 40.8C28.5 41.4 27.6 42 26.7 42C25.8 42 24.9 41.7 24.3 40.8L17.1 31.5C16.2 30.3 16.2 28.2 17.7 27.3C19.2 26.4 21 26.4 21.9 27.9L26.7 34.2L38.1 19.2C39 18 41.1 17.7 42.3 18.6C43.8 19.5 43.8 21.3 42.9 22.8Z" fill="#02BC7D"/>
</g>
<defs>
<clipPath id="clip0_728_1979">
<rect width="60" height="60" fill="white"/>
</clipPath>
</defs>
</svg>
`;

export const PAYMENT_FAILED_SVG = `
<svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_728_2105)">
<path d="M30 0C13.4573 0 0 13.4573 0 30C0 46.5427 13.4573 60 30 60C46.5427 60 60 46.5427 60 30C60 13.4573 46.5427 0 30 0Z" fill="#F44336"/>
<path d="M41.0477 37.5123C42.025 38.49 42.025 40.0698 41.0477 41.0476C40.5601 41.5351 39.9202 41.78 39.2798 41.78C38.6398 41.78 37.9999 41.5351 37.5124 41.0476L30 33.5348L22.4876 41.0476C22.0001 41.5351 21.3602 41.78 20.7202 41.78C20.0798 41.78 19.4398 41.5351 18.9523 41.0476C17.975 40.0698 17.975 38.49 18.9523 37.5123L26.4651 29.9999L18.9523 22.4875C17.975 21.5098 17.975 19.93 18.9523 18.9522C19.9301 17.9749 21.5098 17.9749 22.4876 18.9522L30 26.4651L37.5124 18.9522C38.4901 17.9749 40.0699 17.9749 41.0477 18.9522C42.025 19.93 42.025 21.5098 41.0477 22.4875L33.5348 29.9999L41.0477 37.5123Z" fill="#FAFAFA"/>
</g>
<defs>
<clipPath id="clip0_728_2105">
<rect width="60" height="60" fill="white"/>
</clipPath>
</defs>
</svg>
`;

export const PAYMENT_PENDING_SVG = `
<svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="30" cy="30" r="30" fill="#FFB900"/>
<path d="M30 15C21.716 15 15 21.716 15 30C15 38.284 21.716 45 30 45C38.284 45 45 38.284 45 30C45 21.716 38.284 15 30 15ZM30 42C23.373 42 18 36.627 18 30C18 23.373 23.373 18 30 18C36.627 18 42 23.373 42 30C42 36.627 36.627 42 30 42Z" fill="#FFFFFF"/>
<path d="M31.5 21H28.5V31.5L37.5 36.75L39 34.2L31.5 30V21Z" fill="#FFFFFF"/>
</svg>
`;
