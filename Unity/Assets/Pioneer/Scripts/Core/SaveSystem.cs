using System.IO;
using UnityEngine;

namespace Pioneer.Core
{
    public static class SaveSystem
    {
        private static string SavePath
            => Path.Combine(Application.persistentDataPath, "pioneer_save.json");

        public static void Save(GameState state)
        {
            string json = JsonUtility.ToJson(state, prettyPrint: false);
            File.WriteAllText(SavePath, json);
            Debug.Log($"[Pioneer] 저장: {SavePath}");
        }

        public static GameState Load()
        {
            if (!File.Exists(SavePath)) return null;
            string json = File.ReadAllText(SavePath);
            return JsonUtility.FromJson<GameState>(json);
        }

        public static bool HasSave() => File.Exists(SavePath);

        public static void Delete()
        {
            if (File.Exists(SavePath)) File.Delete(SavePath);
        }
    }
}
