import { a as SvgImage, i as Container } from "./icons-Cj6mEhuZ.js";
import { S as Panel, _ as Alert, b as TextField, f as Title, h as Separator, r as PasswordField, v as Button } from "./vendor-ui-Fxpa-tj8.js";
import { n as useTheme } from "./ThemeContext-BkRmbJFm.js";
import { K as adminVerify2FAFn, W as adminLoginFn, X as openidLoginFn, Y as openIdCheckOptions, p as useLocalize } from "./hooks-BvLbtfRh.js";
import { t as Route } from "./login-B4maodVO.js";
import * as React from "react";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import clsx$1 from "clsx";
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp";
//#region src/components/ThemeSelector.tsx
var themeIcons = {
	system: "display",
	light: "light-bulb-on",
	dark: "moon"
};
var themeLabels = {
	system: "com_nav_theme_system",
	light: "com_nav_theme_light",
	dark: "com_nav_theme_dark"
};
function isDark(theme) {
	if (theme === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches;
	return theme === "dark";
}
function ThemeButton({ theme, onChange }) {
	const localize = useLocalize();
	const nextTheme = isDark(theme) ? "light" : "dark";
	const [announcement, setAnnouncement] = useState("");
	const handleChange = useCallback((next) => {
		onChange(next);
		setAnnouncement(isDark(next) ? localize("com_ui_dark_theme_enabled") : localize("com_ui_light_theme_enabled"));
	}, [onChange, localize]);
	useEffect(() => {
		if (!announcement) return;
		const timeout = setTimeout(() => setAnnouncement(""), 2e3);
		return () => clearTimeout(timeout);
	}, [announcement]);
	useEffect(() => {
		const handleKeyPress = (e) => {
			if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
				e.preventDefault();
				handleChange(nextTheme);
			}
		};
		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [nextTheme, handleChange]);
	const currentLabel = localize(themeLabels[theme] ?? themeLabels.system);
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("button", {
		className: "flex items-center gap-2 rounded-lg p-3 hover:bg-(--cui-color-background-hover)",
		"aria-label": `${localize("com_ui_toggle_theme")}, ${currentLabel}`,
		"aria-keyshortcuts": "Ctrl+Shift+T",
		onClick: (e) => {
			e.preventDefault();
			handleChange(nextTheme);
		},
		onKeyDown: (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleChange(nextTheme);
			}
		},
		style: { color: "var(--cui-color-text-default)" },
		children: /* @__PURE__ */ jsx(SvgImage, {
			name: themeIcons[theme] ?? "display",
			size: "md",
			"aria-hidden": "true"
		})
	}), /* @__PURE__ */ jsx("div", {
		role: "status",
		"aria-live": "polite",
		"aria-atomic": "true",
		className: "sr-only",
		children: announcement
	})] });
}
function ThemeSelector({ returnThemeOnly }) {
	const { theme, setTheme } = useTheme();
	const changeTheme = useCallback((value) => {
		setTheme(value);
	}, [setTheme]);
	if (returnThemeOnly) return /* @__PURE__ */ jsx(ThemeButton, {
		theme,
		onChange: changeTheme
	});
	return /* @__PURE__ */ jsx("div", {
		className: "flex flex-col items-center justify-center sm:pt-0",
		children: /* @__PURE__ */ jsx("div", {
			className: "absolute bottom-0 left-0 m-4",
			children: /* @__PURE__ */ jsx(ThemeButton, {
				theme,
				onChange: changeTheme
			})
		})
	});
}
//#endregion
//#region src/components/InputOTP.tsx
var InputOTP = React.forwardRef(({ className, containerClassName, ...props }, ref) => /* @__PURE__ */ jsx(OTPInput, {
	ref,
	containerClassName: clsx$1("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName),
	className: clsx$1("disabled:cursor-not-allowed", className),
	...props
}));
InputOTP.displayName = "InputOTP";
var InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", {
	ref,
	className: clsx$1("flex items-center", className),
	...props
}));
InputOTPGroup.displayName = "InputOTPGroup";
var InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
	const inputOTPContext = React.useContext(OTPInputContext);
	if (!inputOTPContext) throw new Error("InputOTPSlot must be used within an OTPInput");
	const slot = inputOTPContext.slots[index];
	if (!slot) throw new Error(`InputOTPSlot index ${index} is out of range (${inputOTPContext.slots.length} slots)`);
	const { char, hasFakeCaret, isActive } = slot;
	return /* @__PURE__ */ jsxs("div", {
		ref,
		className: clsx$1("relative flex h-12 w-11 items-center justify-center", "border-y border-r border-(--cui-color-stroke-default)", "bg-(--cui-color-background-default) text-(--cui-color-text-default)", "text-lg font-medium shadow-sm transition-all", "first:rounded-l-lg first:border-l last:rounded-r-lg", isActive ? "z-10 border-(--cui-color-outline) ring-1 ring-(--cui-color-outline)" : "hover:border-(--cui-color-stroke-intense)", className),
		...props,
		children: [char, hasFakeCaret && /* @__PURE__ */ jsx("div", {
			className: "pointer-events-none absolute inset-0 flex items-center justify-center",
			children: /* @__PURE__ */ jsx("div", { className: "h-5 w-px animate-pulse bg-(--cui-color-text-default) duration-1000" })
		})]
	});
});
InputOTPSlot.displayName = "InputOTPSlot";
var InputOTPSeparator = React.forwardRef(({ ...props }, ref) => /* @__PURE__ */ jsx("div", {
	ref,
	role: "separator",
	className: "text-(--cui-color-text-muted)",
	...props,
	children: /* @__PURE__ */ jsx("svg", {
		width: "16",
		height: "2",
		viewBox: "0 0 16 2",
		fill: "none",
		"aria-hidden": "true",
		children: /* @__PURE__ */ jsx("line", {
			x1: "0",
			y1: "1",
			x2: "16",
			y2: "1",
			stroke: "currentColor",
			strokeWidth: "2"
		})
	})
}));
InputOTPSeparator.displayName = "InputOTPSeparator";
//#endregion
//#region src/components/PasswordInput.tsx
/**
* Wraps click-ui PasswordField to:
* - Add a visible focus ring on the show/hide toggle (upstream strips outline)
* - Label the toggle button for screen readers ("Show password" / "Hide password")
*/
var PasswordInput = forwardRef((props, ref) => {
	const localize = useLocalize();
	const wrapperRef = useRef(null);
	useEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		const updateLabel = () => {
			const input = wrapper.querySelector("input");
			const button = wrapper.querySelector("button");
			if (!input || !button) return;
			const visible = input.type === "text";
			button.setAttribute("aria-label", visible ? localize("com_auth_hide_password") : localize("com_auth_show_password"));
		};
		updateLabel();
		const input = wrapper.querySelector("input");
		if (!input) return;
		const observer = new MutationObserver(updateLabel);
		observer.observe(input, {
			attributes: true,
			attributeFilter: ["type"]
		});
		return () => observer.disconnect();
	}, [localize]);
	return /* @__PURE__ */ jsx("div", {
		ref: wrapperRef,
		className: "password-field-a11y w-full",
		children: /* @__PURE__ */ jsx(PasswordField, {
			ref,
			...props
		})
	});
});
//#endregion
//#region src/components/AuthCard.tsx
function AuthCard({ redirectTo = "/", autoRedirectSso = false, ssoAvailable: ssoAvailableProp }) {
	const router = useRouter();
	const localize = useLocalize();
	const [step, setStep] = useState("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [generalError, setGeneralError] = useState("");
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [announcement, setAnnouncement] = useState("");
	const [ssoLoading, setSsoLoading] = useState(false);
	const [autoRedirectFailed, setAutoRedirectFailed] = useState(false);
	const autoRedirectAttempted = useRef(false);
	const [tempToken, setTempToken] = useState("");
	const [totpCode, setTotpCode] = useState("");
	const { data: openIdData } = useQuery({
		...openIdCheckOptions,
		enabled: ssoAvailableProp === void 0
	});
	const ssoAvailable = ssoAvailableProp ?? openIdData?.available ?? false;
	const showAutoRedirect = autoRedirectSso && !autoRedirectFailed;
	useEffect(() => {
		const messages = [
			generalError,
			errors.email,
			errors.password
		].filter(Boolean);
		if (messages.length === 0) {
			setAnnouncement("");
			return;
		}
		setAnnouncement(messages.join(". "));
		const timeout = setTimeout(() => setAnnouncement(""), 4e3);
		return () => clearTimeout(timeout);
	}, [
		generalError,
		errors.email,
		errors.password
	]);
	useEffect(() => {
		if (!autoRedirectSso || autoRedirectAttempted.current) return;
		autoRedirectAttempted.current = true;
		setSsoLoading(true);
		openidLoginFn().then((result) => {
			if (result.error || !result.authUrl) {
				setAutoRedirectFailed(true);
				setGeneralError(result.message || localize("com_auth_sso_redirect_failed"));
				return;
			}
			const authUrl = new URL(result.authUrl);
			if (redirectTo && redirectTo !== "/") authUrl.searchParams.set("redirectTo", redirectTo);
			window.location.href = authUrl.toString();
		}).catch(() => {
			setAutoRedirectFailed(true);
			setGeneralError(localize("com_auth_sso_redirect_failed"));
		}).finally(() => setSsoLoading(false));
	}, [
		autoRedirectSso,
		localize,
		redirectTo
	]);
	const emailSchema = useMemo(() => z.string().email(localize("com_auth_email_invalid")), [localize]);
	const handleLogin = async () => {
		if (isSubmitting) return;
		const newErrors = {};
		if (!email.trim()) newErrors.email = localize("com_auth_email_required");
		else {
			const emailResult = emailSchema.safeParse(email);
			if (!emailResult.success) newErrors.email = emailResult.error.issues[0].message;
		}
		if (!password) newErrors.password = localize("com_auth_password_required");
		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			setGeneralError("");
			return;
		}
		setErrors({});
		setGeneralError("");
		setIsSubmitting(true);
		try {
			const result = await adminLoginFn({ data: {
				email,
				password
			} });
			if (result.error) {
				setGeneralError(result.message || localize("com_auth_login_failed"));
				return;
			}
			if (result.requires2FA) {
				if (!result.tempToken) {
					setGeneralError(localize("com_auth_login_failed"));
					return;
				}
				setTempToken(result.tempToken);
				setTotpCode("");
				setGeneralError("");
				setStep("2fa");
				return;
			}
			setPassword("");
			await router.invalidate();
			router.navigate({ to: redirectTo });
		} catch (error) {
			console.error("Login error:", error);
			setGeneralError(localize("com_auth_unable_connect"));
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleVerify2FA = async (codeOverride) => {
		if (isSubmitting) return;
		const code = codeOverride ?? totpCode;
		if (!/^\d{6}$/.test(code)) {
			setGeneralError(localize("com_auth_2fa_invalid_code"));
			return;
		}
		setGeneralError("");
		setIsSubmitting(true);
		try {
			const result = await adminVerify2FAFn({ data: {
				tempToken,
				totpCode: code
			} });
			if (result.error) {
				if (result.expired) {
					setGeneralError(localize("com_auth_2fa_expired"));
					setStep("login");
					setTempToken("");
					setTotpCode("");
					return;
				}
				setGeneralError(result.message || localize("com_auth_2fa_invalid_code"));
				setTotpCode("");
				return;
			}
			setPassword("");
			setTotpCode("");
			setTempToken("");
			await router.invalidate();
			router.navigate({ to: redirectTo });
		} catch (error) {
			console.error("2FA verification error:", error);
			setGeneralError(localize("com_auth_unable_connect"));
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleBack = () => {
		setStep("login");
		setTempToken("");
		setTotpCode("");
		setGeneralError("");
	};
	const handleKeyDown = (e) => {
		if (e.key === "Enter") handleLogin();
	};
	const handleSsoLogin = async () => {
		if (ssoLoading) return;
		setSsoLoading(true);
		try {
			const result = await openidLoginFn();
			if (result.error) {
				setGeneralError(result.message || localize("com_auth_login_failed"));
				return;
			}
			if (result.authUrl) window.location.href = result.authUrl;
		} catch {
			setGeneralError(localize("com_auth_unable_connect"));
		} finally {
			setSsoLoading(false);
		}
	};
	if (showAutoRedirect) return /* @__PURE__ */ jsx(Panel, {
		className: "auth-card w-full max-w-md",
		padding: "xl",
		radii: "lg",
		hasBorder: true,
		hasShadow: true,
		color: "default",
		children: /* @__PURE__ */ jsxs(Container, {
			orientation: "vertical",
			gap: "lg",
			alignItems: "center",
			children: [
				/* @__PURE__ */ jsx(Title, {
					type: "h1",
					children: localize("com_auth_title")
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-center text-sm text-(--cui-color-text-muted)",
					children: localize("com_auth_sso_redirecting_auto")
				}),
				/* @__PURE__ */ jsx("div", { className: "h-6 w-6 animate-spin rounded-full border-2 border-(--cui-color-stroke-default) border-t-(--cui-color-accent-info)" })
			]
		})
	});
	return /* @__PURE__ */ jsxs(Panel, {
		className: "auth-card w-full max-w-md",
		padding: "xl",
		radii: "lg",
		hasBorder: true,
		hasShadow: true,
		color: "default",
		children: [/* @__PURE__ */ jsxs(Container, {
			orientation: "vertical",
			gap: "lg",
			alignItems: "center",
			children: [
				/* @__PURE__ */ jsx(Title, {
					type: "h1",
					children: step === "2fa" ? localize("com_auth_2fa_title") : localize("com_auth_title")
				}),
				generalError && /* @__PURE__ */ jsx(Alert, {
					type: "banner",
					state: "danger",
					text: generalError
				}),
				step === "2fa" ? /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-center text-sm text-(--cui-color-text-muted)",
						children: localize("com_auth_2fa_prompt")
					}),
					/* @__PURE__ */ jsx("div", {
						className: "flex justify-center",
						children: /* @__PURE__ */ jsxs(InputOTP, {
							maxLength: 6,
							value: totpCode,
							onChange: (value) => setTotpCode(value),
							onComplete: handleVerify2FA,
							pattern: REGEXP_ONLY_DIGITS,
							disabled: isSubmitting,
							"aria-label": localize("com_auth_2fa_code_label"),
							autoFocus: true,
							children: [
								/* @__PURE__ */ jsxs(InputOTPGroup, { children: [
									/* @__PURE__ */ jsx(InputOTPSlot, { index: 0 }),
									/* @__PURE__ */ jsx(InputOTPSlot, { index: 1 }),
									/* @__PURE__ */ jsx(InputOTPSlot, { index: 2 })
								] }),
								/* @__PURE__ */ jsx(InputOTPSeparator, {}),
								/* @__PURE__ */ jsxs(InputOTPGroup, { children: [
									/* @__PURE__ */ jsx(InputOTPSlot, { index: 3 }),
									/* @__PURE__ */ jsx(InputOTPSlot, { index: 4 }),
									/* @__PURE__ */ jsx(InputOTPSlot, { index: 5 })
								] })
							]
						})
					}),
					isSubmitting && /* @__PURE__ */ jsx("p", {
						className: "text-center text-sm text-(--cui-color-text-muted)",
						children: localize("com_auth_2fa_verifying")
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: handleBack,
						disabled: isSubmitting,
						className: "text-sm text-(--cui-color-accent-info) transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50",
						children: localize("com_auth_2fa_back")
					})
				] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx(TextField, {
						label: localize("com_auth_email_label"),
						placeholder: localize("com_auth_email_placeholder"),
						value: email,
						onChange: (value) => {
							setEmail(value);
							if (errors.email) setErrors((prev) => ({
								...prev,
								email: void 0
							}));
						},
						onKeyDown: handleKeyDown,
						error: errors.email
					}),
					/* @__PURE__ */ jsx(PasswordInput, {
						label: localize("com_auth_password_label"),
						placeholder: localize("com_auth_password_placeholder"),
						value: password,
						onChange: (value) => {
							setPassword(value);
							if (errors.password) setErrors((prev) => ({
								...prev,
								password: void 0
							}));
						},
						onKeyDown: handleKeyDown,
						error: errors.password
					}),
					/* @__PURE__ */ jsx(Button, {
						label: isSubmitting ? localize("com_auth_signing_in") : localize("com_auth_sign_in"),
						type: "primary",
						onClick: handleLogin,
						disabled: isSubmitting
					}),
					ssoAvailable && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Separator, { size: "sm" }), /* @__PURE__ */ jsx(Button, {
						label: ssoLoading ? localize("com_auth_sso_redirecting") : localize("com_auth_sso_sign_in"),
						type: "secondary",
						onClick: handleSsoLogin,
						disabled: ssoLoading
					})] })
				] })
			]
		}), /* @__PURE__ */ jsx("div", {
			role: "status",
			"aria-live": "polite",
			"aria-atomic": "true",
			className: "sr-only",
			children: announcement
		})]
	});
}
//#endregion
//#region src/routes/login.tsx?tsr-split=component
function LoginPage() {
	const { redirect } = Route.useSearch();
	const { ssoAvailable, ssoOnly } = Route.useLoaderData();
	return /* @__PURE__ */ jsxs(Container, {
		orientation: "vertical",
		alignItems: "center",
		justifyContent: "center",
		style: {
			minHeight: "100vh",
			padding: "1rem",
			gap: "1rem"
		},
		children: [/* @__PURE__ */ jsx(AuthCard, {
			redirectTo: redirect,
			autoRedirectSso: ssoOnly,
			ssoAvailable
		}), /* @__PURE__ */ jsx("div", {
			className: "sm:absolute sm:bottom-0 sm:left-0 sm:m-4",
			children: /* @__PURE__ */ jsx(ThemeSelector, { returnThemeOnly: true })
		})]
	});
}
//#endregion
export { LoginPage as component };
