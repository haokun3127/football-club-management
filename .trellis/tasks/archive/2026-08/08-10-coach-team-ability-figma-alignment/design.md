# C14 design

The overview endpoint is authoritative for team-level ability. Team metadata is auxiliary and may fail independently. The two reads run once with `Promise.allSettled`: overview failure is an error state; team failure retains overview and says “团队信息待同步”. The page never expands either response into student requests.

The fixed 520rpx Hero centers a 440×360rpx radar and overlays the real `overall` at its center; the score is never placed below the radar. Figma examples for evaluation period, top-three names and export are intentionally represented as unavailable: date “待同步”, no sample ranking rows, and disabled export without a tap binding.
