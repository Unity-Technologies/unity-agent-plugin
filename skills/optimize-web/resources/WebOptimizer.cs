using UnityEditor;
using UnityEditor.Build;
using UnityEngine;

public class WebOptimizer
{
    [MenuItem("Tools/Apply Web Release Settings")]
    public static void Optimize()
    {
        var target = NamedBuildTarget.WebGL;
        PlayerSettings.SetIl2CppCodeGeneration(target, Il2CppCodeGeneration.OptimizeSize);
        PlayerSettings.SetManagedStrippingLevel(target, ManagedStrippingLevel.High);
        PlayerSettings.stripUnusedMeshComponents = true;
        PlayerSettings.WebGL.dataCaching = true;
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.WebGL.debugSymbolMode = WebGLDebugSymbolMode.Off;
        PlayerSettings.WebGL.wasm2023 = true;
        UnityEditor.WebGL.UserBuildSettings.codeOptimization =
            UnityEditor.WebGL.WasmCodeOptimization.DiskSizeLTO;

        // Persist. Without this the settings are applied to the in-memory objects only: every
        // read-back below returns the new value, the run reports success, and nothing reaches
        // ProjectSettings/ProjectSettings.asset. When the Editor session ends the whole change
        // is gone. Observed in testing, so it is not theoretical.
        AssetDatabase.SaveAssets();

        // Read back from the settings after saving and report what was actually stored. Assigning
        // a property and assuming it took is the failure this method exists to demonstrate.
        Debug.Log(
            "Web release settings applied and saved:\n"
            + $"  il2cppCodeGeneration = {PlayerSettings.GetIl2CppCodeGeneration(target)}\n"
            + $"  managedStrippingLevel = {PlayerSettings.GetManagedStrippingLevel(target)}\n"
            + $"  stripUnusedMeshComponents = {PlayerSettings.stripUnusedMeshComponents}\n"
            + $"  dataCaching = {PlayerSettings.WebGL.dataCaching}\n"
            + $"  compressionFormat = {PlayerSettings.WebGL.compressionFormat}\n"
            + $"  exceptionSupport = {PlayerSettings.WebGL.exceptionSupport}\n"
            + $"  debugSymbolMode = {PlayerSettings.WebGL.debugSymbolMode}\n"
            + $"  wasm2023 = {PlayerSettings.WebGL.wasm2023}\n"
            + $"  codeOptimization = {UnityEditor.WebGL.UserBuildSettings.codeOptimization}");
    }
}
