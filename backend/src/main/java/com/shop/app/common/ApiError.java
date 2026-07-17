package com.shop.app.common;

/**
 * Consistent JSON error shape: { "code": ..., "message": ... }.
 * All controllers return this via GlobalExceptionHandler.
 */
public record ApiError(String code, String message) { }
